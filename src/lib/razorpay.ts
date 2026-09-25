import { toast } from "sonner";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

const SERVER_BASE_URL = (import.meta.env.VITE_SOCKET_URL as string) || "http://localhost:5000";

/**
 * Dynamically loads the Razorpay Checkout SDK script if not already loaded.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export type PurchaseResult = {
  success: boolean;
  message?: string;
  error?: string;
  reason?: "cancelled" | "failed" | "verified";
};

export async function initiateLifetimePurchase(params: {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  onSuccess?: () => void;
}): Promise<PurchaseResult> {
  const { userId, userEmail, userName, onSuccess } = params;

  try {
    // 1. Ensure Razorpay Checkout script is loaded
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast.error("Could not load payment gateway. Please check your internet connection.");
      return { success: false, error: "Razorpay script load failed" };
    }

    // 2. Request order from backend
    const orderRes = await fetch(`${SERVER_BASE_URL}/api/payments/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, userEmail }),
    });

    if (!orderRes.ok) {
      const errData = await orderRes.json().catch(() => ({}));
      toast.error(errData.error || "Payment order creation failed");
      return { success: false, error: errData.error || "Failed to create order" };
    }

    const { orderId, amount, currency, keyId, isDemo } = await orderRes.json();

    return new Promise<PurchaseResult>((resolve) => {
      // 3. Configure Razorpay options
      const options = {
        key: keyId,
        amount,
        currency,
        name: "SkillBridge",
        description: "SkillBridge Premium Lifetime Access (One-Time ₹99)",
        image: "https://api.dicebear.com/7.x/identicon/svg?seed=SkillBridge",
        order_id: orderId,
        prefill: {
          name: userName || "Member",
          email: userEmail || "",
        },
        theme: {
          color: "#0284c7",
        },
        // 4. Handle Payment Success callback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          toast.loading("Verifying payment with server...");

          try {
            // 5. Server-side verification
            const verifyRes = await fetch(`${SERVER_BASE_URL}/api/payments/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId,
                isDemo: Boolean(isDemo),
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.verified) {
              toast.dismiss();
              toast.success("Payment Successful! 🎉", {
                description: "SkillBridge Premium Lifetime Access is now active.",
              });
              if (onSuccess) onSuccess();
              resolve({
                success: true,
                reason: "verified",
                message: verifyData.message,
              });
            } else {
              toast.dismiss();
              toast.error("Payment Verification Failed", {
                description: verifyData.error || "Payment could not be verified by server.",
              });
              resolve({
                success: false,
                reason: "failed",
                error: verifyData.error || "Verification failed",
              });
            }
          } catch (err: unknown) {
            toast.dismiss();
            const msg = err instanceof Error ? err.message : "Network error during verification";
            toast.error("Verification error", { description: msg });
            resolve({ success: false, reason: "failed", error: msg });
          }
        },
        // 6. Handle Dismiss / Cancel
        modal: {
          ondismiss: () => {
            toast.message("Payment cancelled", {
              description: "Your account has not been charged.",
            });
            resolve({
              success: false,
              reason: "cancelled",
              error: "User cancelled payment",
            });
          },
        },
      };

      // 7. Open Razorpay Checkout modal
      const rzp = new window.Razorpay(options);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rzp.on("payment.failed", (res: any) => {
        toast.error("Payment Failed", {
          description: res.error?.description || "Transaction failed. Please try again.",
        });
        resolve({
          success: false,
          reason: "failed",
          error: res.error?.description || "Payment failed",
        });
      });

      rzp.open();
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "An unexpected payment error occurred";
    toast.error("Payment error", { description: msg });
    return { success: false, error: msg };
  }
}
