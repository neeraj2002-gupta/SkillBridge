import { Check, Sparkles, ShieldCheck, Zap, Lock, Gift, Clock } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatTrialCountdown, formatDate } from "@/lib/trial";
import { useNavigate } from "@tanstack/react-router";
import PaymentModal from "@/components/PaymentModal";
import { initiateLifetimePurchase } from "@/lib/razorpay";

type Props = {
  className?: string;
  showTrialBanner?: boolean;
};

export default function PricingCard({ className = "", showTrialBanner = true }: Props) {
  const { user, profile, entitlement, refreshProfile, refreshEntitlement } = useAuth();
  const navigate = useNavigate();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const status = entitlement.status;
  const isPremium = entitlement.isPremium || status === "premium_active";

  const handlePurchase = async () => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    if (isPremium) return;

    await initiateLifetimePurchase({
      userId: user.id,
      userEmail: user.email || profile?.email || null,
      userName: profile?.display_name || null,
      onSuccess: () => {
        setShowSuccessModal(true);
        refreshProfile();
        refreshEntitlement();
      },
    });
  };

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-6 md:p-8 shadow-[var(--shadow-card)] backdrop-blur-xl transition-all duration-300 hover:border-primary/40 ${className}`}
      >
        {/* Decorative Ambient Glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[color-mix(in_oklab,var(--teach)_20%,transparent)] blur-3xl" />

        {/* Top Status Banner */}
        {showTrialBanner && (
          <div className="mb-6">
            {status === "trial_active" && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Gift className="h-4 w-4 shrink-0" />
                <span>
                  🎁 <strong>3-Day Free Trial Active</strong> • {formatTrialCountdown(entitlement.remainingDays, entitlement.remainingHours)}
                </span>
              </div>
            )}

            {status === "trial_expired" && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4 shrink-0" />
                <span>⚠️ Your 3-day free trial has ended. Unlock Lifetime Access below for ₹99.</span>
              </div>
            )}

            {status === "premium_active" && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs font-semibold text-primary">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>⭐ SkillBridge Premium Lifetime Access Active</span>
              </div>
            )}
          </div>
        )}

        {/* Header Badge & Title */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Lifetime Access
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
            One-Time Payment • No Subscription
          </span>
        </div>

        <h3 className="mt-4 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          SkillBridge Premium
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Unlock unlimited skill bridges, direct 1-to-1 WebRTC video calls, and priority matching.
        </p>

        {/* Pricing Block */}
        <div className="my-6 flex items-baseline gap-2">
          <span className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
            ₹99
          </span>
          <span className="text-sm font-semibold text-muted-foreground">
            / One-Time Payment
          </span>
        </div>

        {/* Features Checklist */}
        <ul className="my-6 space-y-3 text-xs md:text-sm">
          <li className="flex items-center gap-3 font-medium">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Check className="h-3.5 w-3.5" />
            </span>
            3-Day Free Trial Included
          </li>
          <li className="flex items-center gap-3 font-medium">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Check className="h-3.5 w-3.5" />
            </span>
            Lifetime Premium Access
          </li>
          <li className="flex items-center gap-3 font-medium">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Check className="h-3.5 w-3.5" />
            </span>
            Unlimited Direct 1-to-1 WebRTC Video Calls
          </li>
          <li className="flex items-center gap-3 font-medium">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Check className="h-3.5 w-3.5" />
            </span>
            No Monthly Charges
          </li>
          <li className="flex items-center gap-3 font-medium">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Check className="h-3.5 w-3.5" />
            </span>
            No Yearly Renewal
          </li>
          <li className="flex items-center gap-3 font-medium">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Check className="h-3.5 w-3.5" />
            </span>
            One-Time Payment Only
          </li>
        </ul>

        {/* Primary CTA */}
        {isPremium ? (
          <div className="mt-6 flex flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" /> Lifetime Access Active
            </div>
            <p className="text-[11px] text-muted-foreground">
              Purchased: {formatDate(entitlement.premiumPurchasedAt || profile?.premium_purchased_at)}
            </p>
          </div>
        ) : (
          <button
            onClick={handlePurchase}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[image:var(--gradient-hero)] py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-elegant)] transition-all hover:opacity-95 active:scale-[0.99]"
          >
            <Zap className="h-4 w-4" /> Get Lifetime Access – ₹99
          </button>
        )}

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          🔒 Secure 256-Bit SSL Encrypted Payment via Razorpay
        </p>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-border bg-card p-6 text-center shadow-2xl">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Payment Successful 🎉</h3>
            <p className="text-xs text-muted-foreground">
              Your SkillBridge Premium Lifetime Access is now active.
            </p>
            <div className="w-full rounded-2xl border border-border bg-muted/40 p-4 text-xs">
              <p className="font-semibold text-foreground">Lifetime Access Active</p>
              <p className="mt-1 text-muted-foreground">
                Purchased on: {formatDate(new Date().toISOString())}
              </p>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="mt-2 w-full rounded-xl bg-[image:var(--gradient-hero)] py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:opacity-90"
            >
              Continue to SkillBridge
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          setShowPaymentModal(false);
          setShowSuccessModal(true);
          refreshProfile();
          refreshEntitlement();
        }}
      />
    </>
  );
}
