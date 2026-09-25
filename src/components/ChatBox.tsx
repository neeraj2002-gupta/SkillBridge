import { Link } from "@tanstack/react-router";
import {
  Send, Video, X, Lock, Calendar, Paperclip,
  Image as ImageIcon, Film, FileText, Download, Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { SwapUser } from "@/data/mockUsers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import VideoCall from "@/components/VideoCall";

type DBMessage = {
  id: string;
  swap_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

type AttachPreview = {
  file: File;
  previewUrl: string;
  kind: "image" | "video" | "file";
};

type Props = {
  user: SwapUser | null;
  swapId?: string | null;
  roomToken?: string | null;
  swapStatus?: "pending" | "accepted" | "declined" | "cancelled" | null;
  open: boolean;
  onClose: () => void;
  inline?: boolean;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Detect if content is a JSON attachment */
function parseAttachment(content: string): { url: string; kind: "image" | "video" | "file"; name: string } | null {
  try {
    if (!content.startsWith("{")) return null;
    const p = JSON.parse(content);
    if (p.__type === "attachment" && p.url && p.kind && p.name) return p;
    return null;
  } catch {
    return null;
  }
}

// ─── Standalone sub-components (defined OUTSIDE main component to avoid remount) ───

function MsgContent({ content, mine }: { content: string; mine: boolean }) {
  const att = parseAttachment(content);
  if (!att) {
    return <p className="whitespace-pre-wrap break-words">{content}</p>;
  }
  if (att.kind === "image") {
    return (
      <div className="overflow-hidden rounded-xl">
        <a href={att.url} target="_blank" rel="noopener noreferrer">
          <img src={att.url} alt={att.name} className="max-h-56 w-full object-cover transition hover:opacity-90" />
        </a>
        <p className={`mt-1 truncate text-[11px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          📷 {att.name}
        </p>
      </div>
    );
  }
  if (att.kind === "video") {
    return (
      <div className="overflow-hidden rounded-xl">
        <video src={att.url} controls className="max-h-48 w-full rounded-xl bg-black" />
        <p className={`mt-1 truncate text-[11px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          🎬 {att.name}
        </p>
      </div>
    );
  }
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition hover:opacity-80 ${
        mine ? "border-primary-foreground/20 bg-primary-foreground/10" : "border-border bg-background"
      }`}
    >
      <FileText className="h-8 w-8 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className={`truncate text-xs font-semibold ${mine ? "text-primary-foreground" : "text-foreground"}`}>{att.name}</p>
        <p className={`text-[10px] ${mine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>Tap to download</p>
      </div>
      <Download className="h-4 w-4 shrink-0 opacity-60" />
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ChatBox({ user, swapId, roomToken, swapStatus, open, onClose, inline }: Props) {
  const { user: me, profile, entitlement } = useAuth();
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [callOpen, setCallOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Attachment state
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [attachPreview, setAttachPreview] = useState<AttachPreview | null>(null);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canChat = Boolean(swapId && swapStatus === "accepted" && me && user);
  const roomName = useMemo(() => (roomToken ? `skillbridge-${roomToken}` : ""), [roomToken]);

  // Load history + realtime
  useEffect(() => {
    if (!open || !swapId || !canChat) { setMessages([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("messages").select("*").eq("swap_id", swapId).order("created_at", { ascending: true });
      if (!cancelled) setMessages((data ?? []) as DBMessage[]);
    })();
    const channel = supabase
      .channel(`messages:${swapId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `swap_id=eq.${swapId}` },
        (payload) => {
          const m = payload.new as DBMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [open, swapId, canChat]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Close attach menu on outside click
  useEffect(() => {
    if (!attachMenuOpen) return;
    const handler = () => setAttachMenuOpen(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [attachMenuOpen]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const send = async () => {
    const text = draft.trim();
    if (!text || !canChat || !me || !user || !swapId) return;
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      swap_id: swapId, sender_id: me.id, receiver_id: user.id, content: text,
    });
    if (error) toast.error("Could not send message");
  };

  const handleFileChosen = (file: File | undefined, kind: "image" | "video" | "file") => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("File too large (max 50 MB)"); return; }
    const previewUrl = URL.createObjectURL(file);
    setAttachPreview({ file, previewUrl, kind });
    setAttachMenuOpen(false);
  };

  const sendAttachment = async () => {
    if (!attachPreview || !canChat || !me || !user || !swapId) return;
    const { file, kind, previewUrl } = attachPreview;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `chat/${swapId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (upErr) {
        console.error("Upload error:", upErr);
        toast.error(`Upload failed: ${upErr.message}`);
        return;
      }

      const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      const content = JSON.stringify({ __type: "attachment", url: urlData.publicUrl, kind, name: file.name });

      const { error: msgErr } = await supabase.from("messages").insert({
        swap_id: swapId, sender_id: me.id, receiver_id: user.id, content,
      });
      if (msgErr) { toast.error("Could not send attachment"); return; }

      const label = kind === "image" ? "Photo" : kind === "video" ? "Video" : "File";
      toast.success(`${label} sent! ✅`);
      URL.revokeObjectURL(previewUrl);
      setAttachPreview(null);

      // Reset file inputs so same file can be re-selected
      if (photoInputRef.current) photoInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  const cancelAttach = () => {
    if (attachPreview) URL.revokeObjectURL(attachPreview.previewUrl);
    setAttachPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const proposeSession = async () => {
    if (!scheduleDate || !scheduleTime || !canChat || !me || !user || !swapId) {
      toast.error("Please pick a date and time first"); return;
    }
    const dt = new Date(`${scheduleDate}T${scheduleTime}`);
    const formatted = dt.toLocaleString("en-IN", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const msg = `📅 Session Proposal: I'd like to schedule a session on ${formatted}. Are you available?`;
    const { error } = await supabase.from("messages").insert({
      swap_id: swapId, sender_id: me.id, receiver_id: user.id, content: msg,
    });
    if (error) { toast.error("Could not send proposal"); return; }
    toast.success("Session proposal sent! 📅");
    setScheduleOpen(false); setScheduleDate(""); setScheduleTime("");
  };

  // ── Inlined JSX helpers (NOT sub-components — avoids remount bug) ─────────

  const attachMenuJSX = attachMenuOpen && canChat && (
    <div
      className="absolute bottom-full mb-2 left-0 z-50 flex flex-col gap-1 rounded-2xl border border-border bg-card p-2 shadow-[0_8px_32px_rgba(0,0,0,0.22)] min-w-[160px]"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-muted"
        onClick={() => { setAttachMenuOpen(false); photoInputRef.current?.click(); }}
      >
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-pink-500/15 text-pink-500"><ImageIcon className="h-4 w-4" /></span>
        Photo
      </button>
      <button
        type="button"
        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-muted"
        onClick={() => { setAttachMenuOpen(false); videoInputRef.current?.click(); }}
      >
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-500/15 text-purple-500"><Film className="h-4 w-4" /></span>
        Video
      </button>
      <button
        type="button"
        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-muted"
        onClick={() => { setAttachMenuOpen(false); fileInputRef.current?.click(); }}
      >
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-500/15 text-blue-500"><FileText className="h-4 w-4" /></span>
        Document
      </button>
    </div>
  );

  const previewStripJSX = attachPreview && (
    <div className="flex items-center gap-3 border-t border-border bg-muted/40 px-3 py-2.5">
      {attachPreview.kind === "image" && (
        <img src={attachPreview.previewUrl} alt="preview" className="h-14 w-14 rounded-xl object-cover border border-border" />
      )}
      {attachPreview.kind === "video" && (
        <video src={attachPreview.previewUrl} className="h-14 w-14 rounded-xl object-cover border border-border" muted />
      )}
      {attachPreview.kind === "file" && (
        <div className="grid h-14 w-14 place-items-center rounded-xl bg-blue-500/10 border border-border">
          <FileText className="h-6 w-6 text-blue-500" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">{attachPreview.file.name}</p>
        <p className="text-[10px] text-muted-foreground">{(attachPreview.file.size / 1024).toFixed(1)} KB</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={sendAttachment}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-xl bg-[image:var(--gradient-hero)] px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60 transition hover:opacity-90"
        >
          {uploading
            ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            : <Send className="h-3 w-3" />}
          {uploading ? "Sending…" : "Send"}
        </button>
        <button
          type="button"
          onClick={cancelAttach}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const hiddenInputsJSX = (
    <>
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { handleFileChosen(e.target.files?.[0], "image"); e.target.value = ""; }} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
        onChange={(e) => { handleFileChosen(e.target.files?.[0], "video"); e.target.value = ""; }} />
      <input ref={fileInputRef} type="file" className="hidden"
        onChange={(e) => { handleFileChosen(e.target.files?.[0], "file"); e.target.value = ""; }} />
    </>
  );

  const inputBarJSX = (
    <div>
      {previewStripJSX}
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        {/* Attachment button */}
        <div className="relative">
          {attachMenuJSX}
          <button
            type="button"
            disabled={!canChat}
            onClick={(e) => { e.stopPropagation(); setAttachMenuOpen((o) => !o); }}
            title="Send attachment"
            className={`grid h-10 w-10 place-items-center rounded-xl border transition disabled:opacity-40 ${
              attachMenuOpen
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Paperclip className="h-4 w-4" />
          </button>
        </div>

        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={canChat ? "Write a message…" : "Accept the swap to start chatting"}
          disabled={!canChat}
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canChat}
          className="grid h-10 w-10 place-items-center rounded-xl bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-elegant)] disabled:opacity-50 transition hover:opacity-90"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      {hiddenInputsJSX}
    </div>
  );

  const messagesJSX = (
    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.length === 0 && (
        <p className="mt-8 text-center text-xs text-muted-foreground">Say hi to {user?.name?.split(" ")[0]} 👋</p>
      )}
      {messages.map((m) => {
        const mine = m.sender_id === me?.id;
        return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
              mine ? "rounded-br-sm bg-[image:var(--gradient-hero)] text-primary-foreground"
                   : "rounded-bl-sm bg-muted text-foreground"
            }`}>
              <MsgContent content={m.content} mine={mine} />
              <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {fmtTime(m.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );

  const lockedJSX = (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Lock className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium">
        {swapStatus === "pending" ? "Swap request pending — waiting for acceptance"
          : swapStatus === "declined" ? "This swap was declined"
          : "Chat unlocks once the swap is accepted"}
      </p>
      <p className="max-w-[280px] text-xs text-muted-foreground">
        Once both members accept the swap, real-time messaging and video calls become available.
      </p>
    </div>
  );

  // ── Inline mode ───────────────────────────────────────────────────────────
  if (inline) {
    return (
      <>
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]" style={{ height: "520px" }}>
          <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              {user && <img src={user.avatar} alt={user.name} className="h-9 w-9 rounded-full border border-border bg-muted" />}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.name ?? "Select a chat"}</p>
                <p className="text-[11px] text-[oklch(0.6_0.15_160)]">● Online</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canChat && (
                <button onClick={() => setScheduleOpen((o) => !o)} title="Schedule a session"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition">
                  <Calendar className="h-3.5 w-3.5" /> Schedule
                </button>
              )}
              {canChat && (
                entitlement?.status === "trial_expired" ? (
                  <Link
                    to="/premium"
                    title="Free Trial Expired • Upgrade to Lifetime Access for ₹99"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition"
                  >
                    <Lock className="h-3.5 w-3.5" /> Call 🔒
                  </Link>
                ) : (
                  <button onClick={() => setCallOpen(true)} aria-label="Start video call"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[image:var(--gradient-hero)] px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition hover:opacity-90">
                    <Video className="h-3.5 w-3.5" /> Video Call
                  </button>
                )
              )}
            </div>
          </header>

          {scheduleOpen && canChat && (
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
              <span className="text-xs font-medium text-muted-foreground">📅 Propose a time:</span>
              <input type="date" value={scheduleDate} min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none focus:border-primary" />
              <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none focus:border-primary" />
              <button onClick={proposeSession}
                className="rounded-lg bg-[image:var(--gradient-hero)] px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                Send Proposal
              </button>
              <button onClick={() => setScheduleOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          )}

          {canChat ? messagesJSX : lockedJSX}
          {inputBarJSX}
        </div>

        {callOpen && roomName && (
          <VideoCall roomName={roomName} displayName={profile?.display_name || me?.email || "SkillBridge"} userId={me?.id} onClose={() => setCallOpen(false)} />
        )}
      </>
    );
  }

  // ── Sidebar mode ──────────────────────────────────────────────────────────
  return (
    <>
      {open && <div onClick={onClose} className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm md:hidden" />}
      <aside className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <header className="flex items-center justify-between gap-2 border-b border-border p-4">
          <div className="flex min-w-0 items-center gap-3">
            {user && <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full border border-border bg-muted" />}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name ?? "Select a chat"}</p>
              <p className="text-xs text-[oklch(0.6_0.15_160)]">● Online</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canChat && (
              entitlement?.status === "trial_expired" ? (
                <Link
                  to="/premium"
                  title="Free Trial Expired • Upgrade to Lifetime Access for ₹99"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition"
                >
                  <Lock className="h-3.5 w-3.5" /> Call 🔒
                </Link>
              ) : (
                <button onClick={() => setCallOpen(true)} aria-label="Start video call"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[image:var(--gradient-hero)] px-2.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-elegant)]">
                  <Video className="h-3.5 w-3.5" /> Call
                </button>
              )
            )}
            <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {canChat ? messagesJSX : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Lock className="h-5 w-5" /></div>
            <p className="text-sm font-medium">
              {swapStatus === "pending" ? "Swap request pending" : swapStatus === "declined" ? "Swap was declined" : "Chat unlocks once the swap is accepted"}
            </p>
            <p className="max-w-[260px] text-xs text-muted-foreground">Once both members accept the swap, real-time messaging and video calls become available.</p>
          </div>
        )}

        {inputBarJSX}
      </aside>

      {callOpen && roomName && (
        <VideoCall roomName={roomName} displayName={profile?.display_name || me?.email || "SkillBridge"} userId={me?.id} onClose={() => setCallOpen(false)} />
      )}
    </>
  );
}