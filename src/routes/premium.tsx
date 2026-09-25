import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ShieldCheck, Sparkles, Zap, HelpCircle, X as XIcon } from "lucide-react";
import PricingCard from "@/components/PricingCard";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "SkillBridge Premium — 3-Day Free Trial & Lifetime Access" },
      {
        name: "description",
        content:
          "Unlock SkillBridge Premium for a one-time payment of ₹99. Includes 3-Day Free Trial, unlimited 1-to-1 WebRTC video calls, priority matching, and lifetime updates.",
      },
    ],
  }),
  component: PremiumPage,
});

function PremiumPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      {/* Header SEO H1 */}
      <header className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Simple, Honest Pricing
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
          SkillBridge Premium Lifetime Access
        </h1>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          Start with a <strong>3-Day Free Trial</strong>, then upgrade for a single <strong>₹99 one-time payment</strong>. No monthly subscriptions, no yearly renewals.
        </p>
      </header>

      {/* Main Grid: Pricing Card + Features */}
      <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-5">
          <PricingCard />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-7">
          {/* Feature Comparison Table */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-bold text-foreground">
              Free Trial vs Lifetime Premium Comparison
            </h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-3 font-semibold">Feature</th>
                    <th className="pb-3 text-center font-semibold">Free Account</th>
                    <th className="pb-3 text-center font-semibold text-primary">Lifetime Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-3 font-medium">3-Day Free Trial</td>
                    <td className="py-3 text-center text-emerald-500">✓ 3 Days</td>
                    <td className="py-3 text-center text-emerald-500">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Direct 1-to-1 WebRTC Calls</td>
                    <td className="py-3 text-center text-muted-foreground">Trial Only</td>
                    <td className="py-3 text-center text-emerald-500 font-bold">✓ Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Unlimited Skill Bridge Requests</td>
                    <td className="py-3 text-center text-muted-foreground">Limited</td>
                    <td className="py-3 text-center text-emerald-500 font-bold">✓ Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Priority Matching Algorithm</td>
                    <td className="py-3 text-center text-muted-foreground"><XIcon className="mx-auto h-4 w-4 opacity-40" /></td>
                    <td className="py-3 text-center text-emerald-500 font-bold">✓ Included</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Monthly / Yearly Fees</td>
                    <td className="py-3 text-center text-muted-foreground">None</td>
                    <td className="py-3 text-center font-bold text-emerald-500">₹0 Forever</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Guarantee Card */}
          <div className="flex items-start gap-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 backdrop-blur-md">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Zero Auto-Renewal Guarantee</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                We do not store your credit card or set up recurring subscriptions. The ₹99 charge is strict one-time only. Once paid, your account is activated for lifetime access without any hidden fees.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <section className="mt-16 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 text-primary">
          <HelpCircle className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">FAQ</span>
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          Frequently Asked Questions
        </h2>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-muted/30 p-5">
            <h3 className="text-sm font-bold text-foreground">How does the 3-Day Free Trial work?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Every newly created SkillBridge account automatically gets a 3-Day Free Trial of Premium features. No payment method is required to start your trial.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-5">
            <h3 className="text-sm font-bold text-foreground">Will I be charged after 3 days?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              No! We never automatically charge your account. When the 3-day trial ends, premium features will pause until you choose to unlock Lifetime Access for ₹99.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-5">
            <h3 className="text-sm font-bold text-foreground">Is ₹99 really a one-time payment?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Yes, absolutely. ₹99 gives you full lifetime access to SkillBridge Premium with zero monthly or yearly renewal charges.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-5">
            <h3 className="text-sm font-bold text-foreground">Is my payment secure?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              All transactions are processed through Razorpay's 256-Bit SSL encrypted payment gateway supporting UPI, Credit/Debit cards, NetBanking, and Wallets.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
