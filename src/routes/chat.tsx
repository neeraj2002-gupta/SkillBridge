import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { listMySwaps, type SwapRequest } from "@/lib/swaps";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Messages — SkillBridge" }, { name: "description", content: "Chat with your skill bridge partners." }] }),
  component: Chat,
});

type PartnerProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  location: string;
};

type Thread = {
  swap: SwapRequest;
  partner: PartnerProfile | null;
};

function Chat() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: swaps } = await listMySwaps(user.id);
      const partnerIds = Array.from(new Set(
        swaps.map((s) => (s.requester_id === user.id ? s.recipient_id : s.requester_id)),
      ));
      let profiles: PartnerProfile[] = [];
      if (partnerIds.length) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, role, location")
          .in("id", partnerIds);
        profiles = (ps ?? []) as PartnerProfile[];
      }
      const list: Thread[] = swaps.map((s) => {
        const pid = s.requester_id === user.id ? s.recipient_id : s.requester_id;
        return { swap: s, partner: profiles.find((p) => p.id === pid) ?? null };
      });
      if (!cancelled) { setThreads(list); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Sign in to view your messages</h1>
        <Link to="/login" className="mt-6 inline-flex rounded-xl bg-[image:var(--gradient-hero)] px-5 py-2.5 text-sm font-semibold text-primary-foreground">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground">Your active and pending skill bridge conversations.</p>
        </div>
        <Link to="/match" className="inline-flex items-center gap-1.5 rounded-xl bg-[image:var(--gradient-hero)] px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)]">
          <Sparkles className="h-4 w-4" /> Find matches
        </Link>
      </header>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : threads.length === 0 ? (
          <div className="grid place-items-center gap-3 p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">No conversations yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">Send a swap request from the match page — once it's accepted, your chat will appear here.</p>
            <Link to="/match" className="mt-2 rounded-lg bg-[image:var(--gradient-hero)] px-4 py-2 text-xs font-semibold text-primary-foreground">Browse members</Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {threads.map(({ swap, partner }) => (
              <li key={swap.id}>
                <Link
                  to="/conversation/$id"
                  params={{ id: swap.id }}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted"
                >
                  <img
                    src={partner?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partner?.display_name || swap.id}`}
                    alt={partner?.display_name || "Member"}
                    className="h-10 w-10 rounded-full border border-border bg-muted"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{partner?.display_name || "Member"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {swap.skill_offered || "skill"} ↔ {swap.skill_wanted || "skill"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                      swap.status === "accepted"
                        ? "bg-[color-mix(in_oklab,var(--teach)_18%,transparent)] text-[oklch(0.4_0.13_160)]"
                        : swap.status === "pending"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {swap.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}