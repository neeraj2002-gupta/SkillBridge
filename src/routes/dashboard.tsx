import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRightLeft, BookOpen, CheckCircle2, Clock, GraduationCap, Plus, Sparkles, TrendingUp, Gift, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { listMySwaps, updateSwapStatus, type SwapRequest } from "@/lib/swaps";
import { formatTrialCountdown, formatDate } from "@/lib/trial";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SkillBridge" }, { name: "description", content: "Your skills, bridge requests and progress." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, profile, entitlement, loading } = useAuth();
  const [have, setHave] = useState<string[]>([]);
  const [want, setWant] = useState<string[]>([]);
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [partners, setPartners] = useState<Record<string, { name: string; avatar: string | null }>>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("skills")
        .select("name, type")
        .eq("user_id", user.id);
      if (cancelled) return;
      setHave((data ?? []).filter((s) => s.type === "teach").map((s) => s.name));
      setWant((data ?? []).filter((s) => s.type === "learn").map((s) => s.name));

      const { data: mySwaps } = await listMySwaps(user.id);
      if (cancelled) return;
      setSwaps(mySwaps);
      const partnerIds = Array.from(new Set(
        mySwaps.map((s) => (s.requester_id === user.id ? s.recipient_id : s.requester_id)),
      ));
      if (partnerIds.length) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", partnerIds);
        if (cancelled) return;
        const map: Record<string, { name: string; avatar: string | null }> = {};
        (ps ?? []).forEach((p) => {
          map[p.id] = { name: p.display_name || "Member", avatar: p.avatar_url };
        });
        setPartners(map);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // While auth is being restored from storage, show a spinner instead of the
  // "not logged in" screen — this prevents the flash of wrong content.
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyAuth />
    );
  }

  const accept = async (id: string) => {
    const { error } = await updateSwapStatus(id, "accepted");
    if (error) { toast.error("Could not accept"); return; }
    setSwaps((prev) => prev.map((s) => s.id === id ? { ...s, status: "accepted" } : s));
    toast.success("Swap accepted");
  };
  const decline = async (id: string) => {
    const { error } = await updateSwapStatus(id, "declined");
    if (error) { toast.error("Could not decline"); return; }
    setSwaps((prev) => prev.map((s) => s.id === id ? { ...s, status: "declined" } : s));
  };

  const stats = [
    { label: "Skills I teach", value: have.length, icon: GraduationCap, tone: "teach" as const },
    { label: "Skills I want", value: want.length, icon: BookOpen, tone: "learn" as const },
    { label: "Active swaps", value: swaps.filter((s) => s.status === "accepted").length, icon: Activity, tone: "primary" as const },
    { label: "Pending requests", value: swaps.filter((s) => s.status === "pending").length, icon: TrendingUp, tone: "primary" as const },
  ];

  const firstName = (profile?.display_name || user.email || "there").split(" ")[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-3xl font-bold tracking-tight">{firstName} 👋</h1>
        </div>
        <Link to="/match" className="inline-flex items-center gap-2 rounded-xl bg-[image:var(--gradient-hero)] px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] hover:opacity-90">
          <Sparkles className="h-4 w-4" /> Find new matches
        </Link>
      </header>

      {/* Trial / Premium Status Banner */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${
              entitlement.status === "premium_active"
                ? "bg-primary/10 text-primary"
                : entitlement.status === "trial_active"
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-amber-500/15 text-amber-500"
            }`}>
              {entitlement.status === "premium_active" ? (
                <ShieldCheck className="h-5 w-5" />
              ) : entitlement.status === "trial_active" ? (
                <Gift className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  {entitlement.status === "premium_active" && "⭐ SkillBridge Premium"}
                  {entitlement.status === "trial_active" && "🎁 3-Day Free Trial Active"}
                  {entitlement.status === "trial_expired" && "Free Trial Expired"}
                  {entitlement.status === "free" && "Free Account"}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  entitlement.status === "premium_active"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : entitlement.status === "trial_active"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                }`}>
                  {entitlement.status === "premium_active" && "Lifetime Access"}
                  {entitlement.status === "trial_active" && formatTrialCountdown(entitlement.remainingDays, entitlement.remainingHours)}
                  {entitlement.status === "trial_expired" && "Ended"}
                  {entitlement.status === "free" && "Basic"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {entitlement.status === "premium_active" && `Purchased: ${formatDate(entitlement.premiumPurchasedAt || profile?.premium_purchased_at)}`}
                {entitlement.status === "trial_active" && "Enjoy unlimited video calls and premium matching free for 3 days."}
                {entitlement.status === "trial_expired" && "Your 3-day trial has ended. Unlock Lifetime Access for a one-time ₹99 payment."}
                {entitlement.status === "free" && "Upgrade to Lifetime Access for a one-time ₹99 payment."}
              </p>
            </div>
          </div>

          {entitlement.status !== "premium_active" && (
            <Link
              to="/premium"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[image:var(--gradient-hero)] px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-[var(--shadow-elegant)] hover:opacity-90 transition"
            >
              <Sparkles className="h-3.5 w-3.5" /> Get Lifetime Access – ₹99
            </Link>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const ring = s.tone === "teach" ? "bg-[color-mix(in_oklab,var(--teach)_18%,transparent)] text-[oklch(0.4_0.13_160)]"
            : s.tone === "learn" ? "bg-[color-mix(in_oklab,var(--learn)_18%,transparent)] text-[oklch(0.42_0.14_50)]"
            : "bg-primary/10 text-primary";
          return (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${ring}`}><s.icon className="h-4 w-4" /></span>
              </div>
              <p className="mt-3 text-3xl font-bold">{s.value}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <SkillPanel title="Skills I have" tone="teach" items={have} />
        <SkillPanel title="Skills I want" tone="learn" items={want} />

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] lg:col-span-1">
          <h2 className="text-base font-semibold">Activity</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-[oklch(0.6_0.15_160)]" /> Completed React session with Priya</li>
            <li className="flex gap-3"><Clock className="mt-0.5 h-4 w-4 text-primary" /> Upcoming: Care Plans 101 with Alok</li>
            <li className="flex gap-3"><Sparkles className="mt-0.5 h-4 w-4 text-[oklch(0.7_0.18_60)]" /> Earned "Mentor" badge</li>
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Active swap requests</h2>
          <Link to="/match" className="text-xs font-medium text-primary hover:underline">Find more →</Link>
        </div>
        {swaps.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No swap requests yet. <Link to="/match" className="font-medium text-primary hover:underline">Find a match</Link> to get started.
          </p>
        ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">With</th>
                <th className="px-4 py-3">Offers</th>
                <th className="px-4 py-3">Wants</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {swaps.map((s) => {
                const partnerId = s.requester_id === user.id ? s.recipient_id : s.requester_id;
                const partner = partners[partnerId];
                const isRecipient = s.recipient_id === user.id;
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{partner?.name || "Member"}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-[color-mix(in_oklab,var(--teach)_18%,transparent)] px-2 py-0.5 text-xs text-[oklch(0.4_0.13_160)]">{s.skill_offered || "—"}</span></td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-muted-foreground"><ArrowRightLeft className="h-3 w-3" /> {s.skill_wanted || "—"}</span></td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${s.status === "accepted" ? "bg-[color-mix(in_oklab,var(--teach)_18%,transparent)] text-[oklch(0.4_0.13_160)]" : s.status === "pending" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isRecipient && s.status === "pending" ? (
                        <span className="flex items-center justify-end gap-2">
                          <button onClick={() => accept(s.id)} className="rounded-md bg-[image:var(--gradient-hero)] px-2.5 py-1 text-xs font-semibold text-primary-foreground">Accept</button>
                          <button onClick={() => decline(s.id)} className="rounded-md border border-border px-2.5 py-1 text-xs">Decline</button>
                        </span>
                      ) : (
                        <Link to="/conversation/$id" params={{ id: s.id }} className="text-xs font-medium text-primary hover:underline">Open chat</Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </section>
    </div>
  );
}

function SkillPanel({ title, tone, items }: { title: string; tone: "teach" | "learn"; items: string[] }) {
  const chip = tone === "teach"
    ? "bg-[color-mix(in_oklab,var(--teach)_18%,transparent)] text-[oklch(0.4_0.13_160)] border-[color-mix(in_oklab,var(--teach)_30%,transparent)]"
    : "bg-[color-mix(in_oklab,var(--learn)_18%,transparent)] text-[oklch(0.42_0.14_50)] border-[color-mix(in_oklab,var(--learn)_30%,transparent)]";
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <Link to="/profile" className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary">
          <Plus className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((s) => (
          <span key={s} className={`rounded-full border px-3 py-1 text-sm font-medium ${chip}`}>{s}</span>
        ))}
      </div>
    </div>
  );
}

function EmptyAuth() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">Sign in to view your dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">Track your skills, requests, and sessions in one place.</p>
      <Link to="/login" className="mt-6 inline-flex rounded-xl bg-[image:var(--gradient-hero)] px-5 py-2.5 text-sm font-semibold text-primary-foreground">Sign in</Link>
    </div>
  );
}