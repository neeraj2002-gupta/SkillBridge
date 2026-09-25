import {
  X,
  Copy,
  Check,
  QrCode,
  Smartphone,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const UPI_ID = "ng780830-2@okaxis";
const PHONE_NUMBER = "9151404340";
const AMOUNT = "99";

export default function PaymentModal({ open, onClose, onSuccess }: Props) {
  const { user, refreshProfile, refreshEntitlement } = useAuth();
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  if (!open) return null;

  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=SkillBridge&am=${AMOUNT}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    upiDeepLink
  )}`;

  const copyToClipboard = (text: string, type: "upi" | "phone") => {
    navigator.clipboard.writeText(text);
    if (type === "upi") {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
      toast.success("UPI ID Copied! 📋", { description: text });
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
      toast.success("Phone Number Copied! 📋", { description: text });
    }
  };

  const handleVerifyUTR = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to complete payment verification.");
      return;
    }

    if (!utrNumber.trim() || utrNumber.trim().length < 6) {
      toast.error("Please enter a valid 12-digit UTR or Transaction Reference ID.");
      return;
    }

    setVerifying(true);

    try {
      const serverUrl = (import.meta.env.VITE_SOCKET_URL as string) || "http://localhost:5000";
      const res = await fetch(`${serverUrl}/api/payments/manual-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          utrNumber: utrNumber.trim(),
        }),
      });

      const data = await res.json();

      setVerifying(false);

      if (res.ok && data.verified) {
        setVerifiedSuccess(true);
        await refreshProfile();
        await refreshEntitlement();
        onSuccess();
        toast.success("Payment Verified! 🎉", {
          description: "SkillBridge Lifetime Premium is now active!",
        });
      } else {
        toast.error("Verification Failed", {
          description: data.error || "Could not verify payment reference ID. Please try again.",
        });
      }
    } catch (err: unknown) {
      setVerifying(false);
      const msg = err instanceof Error ? err.message : "Network error during verification";
      toast.error("Verification error", { description: msg });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in">
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-900 text-white shadow-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-hero)] text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Pay ₹99 for Lifetime Access</h3>
              <p className="text-[11px] text-white/60">Scan QR Code or pay via UPI ID / Phone Number</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        {verifiedSuccess ? (
          <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Payment Verified Successfully! 🎉</h3>
              <p className="mt-1 text-xs text-white/70">
                Your SkillBridge Premium Lifetime Access is now unlocked and active on your account.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 w-full rounded-xl bg-[image:var(--gradient-hero)] py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
            >
              Start Using SkillBridge Premium
            </button>
          </div>
        ) : (
          <div className="max-h-[80vh] overflow-y-auto p-6">
            {/* QR Code Card */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/5 p-5 text-center">
              <div className="relative rounded-2xl bg-white p-3 shadow-xl">
                <img
                  src={qrCodeUrl}
                  alt="SkillBridge ₹99 UPI QR Code"
                  className="h-48 w-48 object-contain"
                />
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                  ₹99 One-Time Payment
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                  Lifetime Access
                </span>
              </div>

              <p className="mt-2 text-xs text-white/60">
                Scan with Google Pay, PhonePe, Paytm, BHIM, or any UPI App
              </p>

              {/* Mobile Deep Link */}
              <a
                href={upiDeepLink}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white border border-white/15 hover:bg-white/20 transition md:hidden"
              >
                <Smartphone className="h-4 w-4 text-emerald-400" /> Tap to Open GPay / PhonePe <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Direct UPI ID & Phone Details */}
            <div className="mt-5 space-y-3">
              {/* UPI ID */}
              <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 p-3.5">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/50">
                    UPI ID
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {UPI_ID}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(UPI_ID, "upi")}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition"
                >
                  {copiedUpi ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedUpi ? "Copied" : "Copy UPI"}
                </button>
              </div>

              {/* Phone / Paytm / GPay Number */}
              <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 p-3.5">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/50">
                    Phone / GPay / PhonePe / Paytm
                  </span>
                  <span className="font-mono text-sm font-bold text-white">
                    +91 {PHONE_NUMBER}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(PHONE_NUMBER, "phone")}
                  className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white border border-white/15 hover:bg-white/20 transition"
                >
                  {copiedPhone ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedPhone ? "Copied" : "Copy Number"}
                </button>
              </div>
            </div>

            {/* UTR / Transaction Reference Verification Form */}
            <form onSubmit={handleVerifyUTR} className="mt-5 rounded-2xl border border-primary/30 bg-primary/10 p-4">
              <label className="block">
                <span className="block text-xs font-semibold text-white">
                  Step 2: Enter 12-Digit UTR / Transaction Reference ID
                </span>
                <span className="block text-[11px] text-white/60">
                  After paying ₹99, paste the 12-digit UTR number from GPay/PhonePe to instantly activate Lifetime Premium.
                </span>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. 426891029482"
                  className="mt-2.5 w-full rounded-xl border border-white/20 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <button
                type="submit"
                disabled={verifying}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-hero)] py-3 text-xs font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
              >
                {verifying ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Verifying Payment…
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" /> Verify & Activate Lifetime Access
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
