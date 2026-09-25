import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, X as XIcon, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import ChatBox from "@/components/ChatBox";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { updateSwapStatus, type SwapRequest } from "@/lib/swaps";
import type { SwapUser } from "@/data/mockUsers";

export const Route = createFileRoute("/conversation/$id")({
  head: () => ({
    meta: [
      { title: `Conversation — SkillBridge` },
      { name: "description", content: "Live chat with your skill bridge partner" },
    ],
  }),
  component: ChatThread,
});

function ChatThread() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [swap, setSwap] = useState<SwapRequest | null>(null);
  const [partner, setPartner] = useState<SwapUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: s, error } = await supabase
        .from("swap_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (!s) {
        console.error("Swap not found or access denied", error);
        setLoading(false);
        return;
      }
      const sw = s as SwapRequest;
      setSwap(sw);
      const partnerId = sw.requester_id === user.id ? sw.recipient_id : sw.requester_id;
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", partnerId)
        .maybeSingle();
      if (cancelled) return;
      if (p) {
        setPartner({
          id: p.id,
          name: p.display_name || "Member",
          avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.display_name || p.id}`,
          role: p.role || "Member",
          location: p.location || "—",
          rating: Number(p.rating) || 5,
          bio: p.bio || "",
          teach: [],
          learn: [],
          category: "Tech",
          user_status: p.user_status || "Other",
          institution_name: p.institution_name || null,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Sign in to view this chat</h1>
        <Link to="/login" className="mt-6 inline-flex rounded-xl bg-[image:var(--gradient-hero)] px-5 py-2.5 text-sm font-semibold text-primary-foreground">Sign in</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-muted-foreground">Loading conversation…</div>;
  }

  if (!swap || !partner) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Conversation not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have been removed or you don't have access.</p>
        <Link to="/chat" className="mt-6 inline-flex rounded-xl bg-[image:var(--gradient-hero)] px-5 py-2.5 text-sm font-semibold text-primary-foreground">Back to messages</Link>
      </div>
    );
  }

  const isRecipient = swap.recipient_id === user.id;
  const isPending = swap.status === "pending";

  const accept = async () => {
    const { error } = await updateSwapStatus(swap.id, "accepted");
    if (error) { toast.error("Could not accept swap"); return; }
    setSwap({ ...swap, status: "accepted" });
    toast.success("Swap accepted — chat & video call unlocked! 🎉");
  };

  const decline = async () => {
    const { error } = await updateSwapStatus(swap.id, "declined");
    if (error) { toast.error("Could not decline"); return; }
    setSwap({ ...swap, status: "declined" });
    toast.message("Swap declined");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <button
        onClick={() => navigate({ to: "/chat" })}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" /> All messages
      </button>

      {/* Swap Info Card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-4">
          <img src={partner.avatar} alt={partner.name} className="h-14 w-14 rounded-2xl border border-border bg-muted" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{partner.name}</h1>
            <p className="text-xs text-muted-foreground">{partner.role} • {partner.location}</p>
            <p className="mt-1 text-xs">
              <span className="font-medium">Offers:</span> {swap.skill_offered || "—"}
              {" · "}
              <span className="font-medium">Wants:</span> {swap.skill_wanted || "—"}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
              swap.status === "accepted"
                ? "bg-[color-mix(in_oklab,var(--teach)_18%,transparent)] text-[oklch(0.4_0.13_160)]"
                : swap.status === "pending"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {swap.status}
          </span>
        </div>

        {isRecipient && isPending && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={accept}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[image:var(--gradient-hero)] px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition hover:opacity-90"
            >
              <Check className="h-4 w-4" /> Accept swap
            </button>
            <button
              onClick={decline}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition"
            >
              <XIcon className="h-4 w-4" /> Decline
            </button>
          </div>
        )}

        {!isRecipient && isPending && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
            <MessageCircle className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs text-foreground">
              Swap request sent! Waiting for <span className="font-semibold">{partner.name}</span> to accept. Chat and video call will unlock once accepted.
            </p>
          </div>
        )}
      </div>

      {/* Inline Chat */}
      <div className="mt-6">
        <ChatBox
          user={partner}
          swapId={swap.id}
          roomToken={swap.room_token}
          swapStatus={swap.status}
          open
          onClose={() => navigate({ to: "/chat" })}
          inline
        />
      </div>
    </div>
  );
}
