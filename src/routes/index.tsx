import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Search, Sparkles, Users, Handshake, MessageCircle, GraduationCap, Stethoscope, Code2 } from "lucide-react";
import { useEffect, useState } from "react";
import Card from "@/components/Card";
import PricingCard from "@/components/PricingCard";
import { supabase } from "@/integrations/supabase/client";
import type { SwapUser } from "@/data/mockUsers";

export const Route = createFileRoute("/")(({
  head: () => ({
    meta: [
      { title: "SkillBridge — Join the skill-bridge community" },
      { name: "description", content: "Teach what you know. Learn what you don't. Match with people whose skills complement yours." },
    ],
  }),
  component: Home,
}));

const steps = [
  { icon: Users, title: "Create your profile", text: "List the skills you can teach and the ones you want to learn." },
  { icon: Search, title: "Find your match", text: "Discover members whose skill stack mirrors yours — perfectly." },
  { icon: Handshake, title: "Swap & grow", text: "Schedule sessions, message, and build skills together." },
];

const allowed = ["Tech", "Healthcare", "Design", "Business"] as const;

function Home() {
  const [featured, setFeatured] = useState<SwapUser[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("id, display_name, avatar_url, bio, role, location, category, rating, user_status, institution_name")
        .limit(3);

      if (cancelled || !profiles || profiles.length === 0) return;

      const ids = profiles.map((p) => p.id).filter(Boolean) as string[];
      const { data: skills } = await supabase
        .from("skills")
        .select("user_id, name, type")
        .in("user_id", ids);

      if (cancelled) return;

      const mapped: SwapUser[] = profiles
        .filter((p): p is typeof p & { id: string } => Boolean(p?.id))
        .map((p) => {
          const userSkills = (skills ?? []).filter((s) => s.user_id === p.id);
          const cat = p.category && (allowed as readonly string[]).includes(p.category as string)
            ? (p.category as SwapUser["category"])
            : "Tech";
          return {
            id: p.id,
            name: p.display_name || "Member",
            avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.display_name || p.id}`,
            role: p.role || "Member",
            location: p.location || "—",
            rating: Number(p.rating) || 5,
            bio: p.bio || "",
            teach: userSkills.filter((s) => s.type === "teach").map((s) => s.name),
            learn: userSkills.filter((s) => s.type === "learn").map((s) => s.name),
            category: cat,
            user_status: p.user_status || undefined,
            institution_name: p.institution_name || null,
          };
        });

      setFeatured(mapped);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[image:var(--gradient-soft)]" />
        <div aria-hidden className="absolute -top-32 left-1/2 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-2 md:items-center md:px-6 md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Peer-to-peer skill exchange
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">
              Trade skills.
              <span className="block bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">Grow together.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              SkillBridge connects coders with clinicians, designers with developers — anyone with knowledge to share and curiosity to grow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-[image:var(--gradient-hero)] px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition hover:opacity-90"
              >
                Join Community <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/match"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
              >
                Browse members
              </Link>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[{ k: "12k+", v: "Members" }, { k: "340+", v: "Skills" }, { k: "98%", v: "Match rate" }].map((s) => (
                <div key={s.v}>
                  <dt className="text-2xl font-bold text-foreground">{s.k}</dt>
                  <dd className="text-xs text-muted-foreground">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="grid gap-4 sm:grid-cols-2">
              <FloatTile icon={Code2} title="React" subtitle="Priya can teach" tone="teach" className="sm:translate-y-6" />
              <FloatTile icon={Stethoscope} title="Care Plans" subtitle="Alok can teach" tone="teach" />
              <FloatTile icon={GraduationCap} title="Java" subtitle="Alok wants to learn" tone="learn" />
              <FloatTile icon={MessageCircle} title="Pharmacology" subtitle="Priya wants to learn" tone="learn" className="sm:translate-y-6" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">Three steps to your next skill</h2>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
              <span className="absolute -top-3 right-5 rounded-full bg-[image:var(--gradient-hero)] px-2.5 py-0.5 text-xs font-bold text-primary-foreground">0{i + 1}</span>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Featured — only shown when real users exist */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-24 md:px-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">Featured members</h2>
              <p className="text-sm text-muted-foreground">A peek at members looking for a match this week.</p>
            </div>
            <Link to="/match" className="hidden text-sm font-medium text-primary hover:underline md:inline">See all →</Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((u) => <Card key={u.id} user={u} />)}
          </div>
        </section>
      )}

      {/* Premium & Trial Pricing Section */}
      <section className="border-t border-border/60 bg-muted/20 py-16">
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <div className="mb-10 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Simple, Transparent Pricing
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-4xl">
              Start Free, Upgrade Once for Life
            </h2>
            <p className="mt-2 text-xs text-muted-foreground md:text-sm">
              Enjoy a <strong>3-Day Free Trial</strong> with full premium features. Upgrade for a single ₹99 payment with zero recurring fees.
            </p>
          </div>

          <PricingCard />
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row md:px-6">
          <p>
            © {new Date().getFullYear()} SkillBridge. Built by{" "}
            <a
              href="https://www.linkedin.com/in/neerajgupta-dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:text-primary transition-colors"
            >
              neerajgupta-dev
            </a>
          </p>
          <div className="flex gap-4">
            <Link to="/match" className="hover:text-primary">Match</Link>
            <Link to="/login" className="hover:text-primary">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FloatTile({ icon: Icon, title, subtitle, tone, className = "" }: { icon: typeof Code2; title: string; subtitle: string; tone: "teach" | "learn"; className?: string }) {
  const colors = tone === "teach"
    ? "border-[color-mix(in_oklab,var(--teach)_30%,transparent)] bg-[color-mix(in_oklab,var(--teach)_10%,var(--card))]"
    : "border-[color-mix(in_oklab,var(--learn)_30%,transparent)] bg-[color-mix(in_oklab,var(--learn)_10%,var(--card))]";
  return (
    <div className={`rounded-2xl border ${colors} p-5 shadow-[var(--shadow-card)] backdrop-blur ${className}`}>
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-card text-foreground shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-base font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
