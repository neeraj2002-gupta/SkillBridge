import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Filter, Search, Sparkles, Zap, Database } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Card from "@/components/Card";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { mockUsers, type SwapUser } from "@/data/mockUsers";
import { rankMatches } from "@/lib/matching";
import { createOrGetSwap } from "@/lib/swaps";

export const Route = createFileRoute("/match")({
  head: () => ({ meta: [{ title: "Find a match — SkillBridge" }, { name: "description", content: "Browse members with complementary skills." }] }),
  component: Match,
});

const categories = ["All", "Tech", "Healthcare", "Design", "Business"] as const;
const statuses = ["All", "Student", "Working Professional", "Self-Employed", "Other"] as const;

type ProfileRow = {
  id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  location: string | null;
  category: string | null;
  rating: number | null;
  user_status: string | null;
  institution_name: string | null;
};

type SkillRow = { user_id: string; name: string; type: "teach" | "learn" };

function Match() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof categories)[number]>("All");
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");
  const [perfectOnly, setPerfectOnly] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const [users, setUsers] = useState<SwapUser[]>([]);
  const [mySkills, setMySkills] = useState<{ teach: string[]; learn: string[] }>({ teach: [], learn: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // My own skills (for matching algorithm)
      if (user) {
        const { data: mine } = await supabase
          .from("skills")
          .select("name, type")
          .eq("user_id", user.id);
        if (!cancelled) {
          setMySkills({
            teach: (mine ?? []).filter((s) => s.type === "teach").map((s) => s.name),
            learn: (mine ?? []).filter((s) => s.type === "learn").map((s) => s.name),
          });
        }
      }

      // Use the public-safe view so we never request `email` or `id_number`.
      const profilesQuery = supabase
        .from("profiles_public")
        .select("id, display_name, avatar_url, bio, role, location, category, rating, user_status, institution_name");
      const { data: profiles, error: pErr } = user
        ? await profilesQuery.neq("id", user.id)
        : await profilesQuery;
      if (pErr) {
        // Live data failed → flip on Demo Mode so the UI never looks empty.
        if (!cancelled) {
          setUseMock(true);
          toast.message("Showing demo data", { description: "Live data unavailable — using sample profiles." });
          setLoading(false);
        }
        return;
      }

      const ids = (profiles ?? []).map((p) => p.id).filter((x): x is string => Boolean(x));
      let skills: SkillRow[] = [];
      if (ids.length) {
        const { data: s } = await supabase
          .from("skills")
          .select("user_id, name, type")
          .in("user_id", ids);
        skills = (s ?? []) as SkillRow[];
      }

      if (cancelled) return;
      const mapped: SwapUser[] = (profiles ?? [])
        .filter((p): p is ProfileRow & { id: string } => Boolean(p?.id))
        .map((p) => {
        const mySkills = skills.filter((s) => s.user_id === p.id);
        const allowed = ["Tech", "Healthcare", "Design", "Business"] as const;
        const cat = p.category && (allowed as readonly string[]).includes(p.category)
          ? (p.category as SwapUser["category"])
          : "Tech";
        return {
          id: p.id,
          name: p.display_name || "Anonymous",
          avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.display_name || p.id}`,
          role: p.role || "Member",
          location: p.location || "—",
          rating: Number(p.rating) || 5,
          bio: p.bio || "",
          teach: mySkills.filter((s) => s.type === "teach").map((s) => s.name),
          learn: mySkills.filter((s) => s.type === "learn").map((s) => s.name),
          category: cat,
          user_status: p.user_status || "Other",
          institution_name: p.institution_name || null,
        };
      });
      setUsers(mapped);
      // If there are zero real members yet, gently enable mock data so the
      // discovery page still feels populated for first-time visitors.
      if (!cancelled && mapped.length === 0) setUseMock(true);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const source = useMock ? mockUsers : users;

  const ranked = useMemo(() => rankMatches(mySkills, source), [mySkills, source]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ranked.filter(({ user: u, perfect }) => {
      if (perfectOnly && !perfect) return false;
      const matchCat = cat === "All" || u.category === cat;
      const matchStatus = status === "All" || u.user_status === status;
      const hay = [u.name, u.role, u.bio, ...u.teach, ...u.learn].join(" ").toLowerCase();
      return matchCat && matchStatus && (q === "" || hay.includes(q));
    });
  }, [query, cat, status, ranked, perfectOnly]);

  const perfectCount = ranked.filter((r) => r.perfect).length;

  const handleRequestSwap = async (target: SwapUser, iCanTeach: string[], iCanLearn: string[]) => {
    if (!user) {
      toast.error("Sign in to request a connection");
      navigate({ to: "/login" });
      return;
    }
    if (useMock) {
      toast.success(`Mock connection request sent to ${target.name}`, {
        description: "Turn off mock data to send a real request.",
      });
      return;
    }
    const skillOffered = iCanTeach[0] || mySkills.teach[0] || "";
    const skillWanted = iCanLearn[0] || mySkills.learn[0] || "";
    const { data, error } = await createOrGetSwap({
      requesterId: user.id,
      recipientId: target.id,
      skillOffered,
      skillWanted,
    });
    if (error || !data) { toast.error(error || "Could not create connection"); return; }
    toast.success(`Connection request sent to ${target.name}`);
    navigate({ to: "/conversation/$id", params: { id: data.id } });
  };

  const handleMessage = async (target: SwapUser) => {
    if (useMock) { toast.message("Mock mode — chat is read-only"); return; }
    if (!user) { navigate({ to: "/login" }); return; }
    const { data } = await createOrGetSwap({
      requesterId: user.id,
      recipientId: target.id,
      skillOffered: mySkills.teach[0] || "",
      skillWanted: mySkills.learn[0] || "",
    });
    if (data) navigate({ to: "/conversation/$id", params: { id: data.id } });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <header className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" /> {results.length} matches available · {perfectCount} perfect
        </span>
        <h1 className="text-3xl font-bold tracking-tight">Find your skill bridge partner</h1>
        <p className="text-sm text-muted-foreground">Search by skill, role, or interest — e.g. <span className="font-medium text-foreground">"Java"</span> or <span className="font-medium text-foreground">"Nursing"</span>.</p>
      </header>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills, names, or roles…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          <Filter className="mr-1 h-4 w-4 shrink-0 text-muted-foreground" />
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${cat === c ? "bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-elegant)]" : "border border-border text-muted-foreground hover:text-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
        <span className="mr-1 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${status === s ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]" : "border border-border text-muted-foreground hover:text-foreground"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
        <button
          onClick={() => setPerfectOnly((p) => !p)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            perfectOnly ? "bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-elegant)]" : "border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="h-3.5 w-3.5" /> Perfect matches only
        </button>
        <button
          onClick={() => setUseMock((m) => !m)}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            useMock ? "bg-foreground text-background" : "border border-border text-muted-foreground hover:text-foreground"
          }`}
          title="Demo with mock data (Java, React, Nursing Care Plans...)"
        >
          <Database className="h-3.5 w-3.5" /> {useMock ? "Mock data ON" : "Use mock data"}
        </button>
      </div>

      {loading ? (
        <div className="mt-12 grid place-items-center rounded-2xl border border-dashed border-border p-16 text-center">
          <p className="text-sm text-muted-foreground">Loading members…</p>
        </div>
      ) : results.length === 0 ? (
        <div className="mt-12 grid place-items-center rounded-2xl border border-dashed border-border p-16 text-center">
          <p className="text-sm text-muted-foreground">No matches found. Try widening filters or toggle mock data.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <Card
              key={r.user.id}
              user={r.user}
              perfect={r.perfect}
              iCanTeach={r.iCanTeach}
              iCanLearn={r.iCanLearn}
              onMessage={handleMessage}
              onRequest={(u) => handleRequestSwap(u, r.iCanTeach, r.iCanLearn)}
            />
          ))}
        </div>
      )}
    </div>
  );
}