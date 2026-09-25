import { Link, useNavigate } from "@tanstack/react-router";
import {
  GraduationCap, LayoutDashboard, MessageCircle, Search,
  User as UserIcon, LogOut, Menu, X, Moon, Sun, Bell, Sparkles
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/integrations/supabase/client";

type Notif = {
  id: string;
  type: "swap_request" | "swap_accepted" | "message";
  text: string;
  swapId: string;
  createdAt: string;
  read: boolean;
};

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/match",     label: "Match",     icon: Search },
  { to: "/chat",      label: "Messages",  icon: MessageCircle },
  { to: "/profile",   label: "Profile",   icon: UserIcon },
  { to: "/premium",   label: "Premium",   icon: Sparkles },
] as const;

export default function Navbar() {
  const auth         = useAuth();
  const themeCtx     = useTheme();
  const navigate     = useNavigate();
  const bellRef      = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen,   setBellOpen]   = useState(false);
  const [notifs,     setNotifs]     = useState<Notif[]>([]);

  const user    = auth?.user;
  const profile = auth?.profile;
  const loading = auth?.loading;
  const theme   = themeCtx?.theme || "light";
  const setTheme = themeCtx?.setTheme || (() => {});

  const unread = notifs.filter((n) => !n.read).length;

  /* ── fetch notifications ───────────────────────────────────────────── */
  const fetchNotifs = async (uid: string) => {
    const list: Notif[] = [];

    // 1. Pending swap requests where I am recipient
    const { data: pending } = await supabase
      .from("swap_requests")
      .select("*")
      .eq("recipient_id", uid)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    // 2. Swaps I requested that were accepted
    const { data: accepted } = await supabase
      .from("swap_requests")
      .select("*")
      .eq("requester_id", uid)
      .eq("status", "accepted")
      .order("updated_at", { ascending: false })
      .limit(5);

    // Collect user IDs to fetch profiles
    const userIdsToFetch = new Set<string>();
    (pending ?? []).forEach(p => userIdsToFetch.add(p.requester_id));
    (accepted ?? []).forEach(a => userIdsToFetch.add(a.recipient_id));

    // Fetch profiles
    const profileMap: Record<string, string> = {};
    if (userIdsToFetch.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", Array.from(userIdsToFetch));
      
      (profiles ?? []).forEach(p => {
        profileMap[p.id] = p.display_name || "Someone";
      });
    }

    (pending ?? []).forEach((r) => {
      const name = profileMap[r.requester_id] || "Someone";
      list.push({
        id: `sr-${r.id}`,
        type: "swap_request",
        text: `${name} sent you a swap request`,
        swapId: r.id,
        createdAt: r.created_at,
        read: false,
      });
    });

    (accepted ?? []).forEach((r) => {
      const name = profileMap[r.recipient_id] || "Someone";
      list.push({
        id: `sa-${r.id}`,
        type: "swap_accepted",
        text: `${name} accepted your swap request 🎉`,
        swapId: r.id,
        createdAt: r.updated_at,
        read: false,
      });
    });

    // Sort by date descending, take top 8
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setNotifs(list.slice(0, 8));
  };

  useEffect(() => {
    if (!user) { setNotifs([]); return; }
    fetchNotifs(user.id);

    const ch = supabase
      .channel("navbar_notifs")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "swap_requests",
        filter: `recipient_id=eq.${user.id}`,
      }, () => fetchNotifs(user.id))
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "swap_requests",
        filter: `requester_id=eq.${user.id}`,
      }, () => fetchNotifs(user.id))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Close bell dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));

  const handleNotifClick = (n: Notif) => {
    markAllRead();
    setBellOpen(false);
    navigate({ to: "/conversation/$id", params: { id: n.swapId } });
  };

  function fmtAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-elegant)]">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Skill<span className="text-primary">Bridge</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {user && navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to} to={to}
              activeProps={{ className: "bg-primary/10 text-primary" }}
              className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>

        {/* Desktop Right */}
        <div className="hidden items-center gap-1 md:flex">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* 🔔 Notification Bell */}
          {user && (
            <div ref={bellRef} className="relative">
              <button
                onClick={() => { setBellOpen((o) => !o); }}
                className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white animate-pulse">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {bellOpen && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-border bg-card shadow-2xl">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <p className="text-sm font-semibold">Notifications</p>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-[11px] text-primary hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>

                  <ul className="max-h-72 overflow-y-auto divide-y divide-border">
                    {notifs.length === 0 ? (
                      <li className="p-6 text-center text-sm text-muted-foreground">No notifications yet</li>
                    ) : notifs.map((n) => (
                      <li key={n.id}>
                        <button
                          onClick={() => handleNotifClick(n)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-muted ${!n.read ? "bg-primary/5" : ""}`}
                        >
                          <span className="mt-0.5 text-base">
                            {n.type === "swap_request" ? "🔔" : n.type === "swap_accepted" ? "✅" : "💬"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${!n.read ? "font-semibold" : "font-normal"}`}>{n.text}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtAgo(n.createdAt)}</p>
                          </div>
                          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="border-t border-border px-4 py-2.5">
                    <Link
                      to="/chat"
                      onClick={() => setBellOpen(false)}
                      className="block text-center text-xs font-medium text-primary hover:underline"
                    >
                      View all messages →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Entitlement Badge */}
          {user && (
            <Link to="/premium" className="ml-1">
              {auth?.entitlement?.status === "premium_active" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  ⭐ Premium
                </span>
              ) : auth?.entitlement?.status === "trial_active" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  🎁 Trial ({auth.entitlement.remainingDays}d)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  ⚡ Upgrade ₹99
                </span>
              )}
            </Link>
          )}

          {/* Avatar + Logout */}
          {loading ? (
            // Auth is being restored — show nothing to avoid the Sign in flash
            <div className="ml-1 h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <>
              <img
                src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.display_name || user.email}`}
                alt={profile?.display_name || "Account"}
                className="ml-1 h-9 w-9 rounded-full border border-border bg-muted object-cover"
              />
              <button
                onClick={async () => { await auth?.logout(); navigate({ to: "/" }); }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-destructive transition"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Sign in</Link>
              <Link to="/register" className="rounded-lg bg-[image:var(--gradient-hero)] px-4 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-elegant)] transition hover:opacity-90">
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile right */}
        <div className="flex items-center gap-1 md:hidden">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {user && (
            <button onClick={() => { setBellOpen((o) => !o); }} className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted">
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />}
            </button>
          )}
          <button onClick={() => setMobileOpen((o) => !o)} className="rounded-lg p-2 hover:bg-muted" aria-label="Menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 p-3">
            {user ? (
              <>
                {navItems.map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-muted">
                    <Icon className="h-4 w-4" /> {label}
                  </Link>
                ))}
                <button
                  onClick={async () => { await auth?.logout(); setMobileOpen(false); navigate({ to: "/" }); }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-muted"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-muted">Sign in</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Get started</Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile bell dropdown */}
      {bellOpen && user && (
        <div className="absolute left-4 right-4 top-16 z-50 rounded-2xl border border-border bg-card shadow-2xl md:hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && <button onClick={markAllRead} className="text-[11px] text-primary hover:underline">Mark all read</button>}
          </div>
          <ul className="max-h-60 overflow-y-auto divide-y divide-border">
            {notifs.length === 0 ? (
              <li className="p-5 text-center text-sm text-muted-foreground">No notifications yet</li>
            ) : notifs.map((n) => (
              <li key={n.id}>
                <button onClick={() => handleNotifClick(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted ${!n.read ? "bg-primary/5" : ""}`}>
                  <span className="mt-0.5">{n.type === "swap_request" ? "🔔" : n.type === "swap_accepted" ? "✅" : "💬"}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${!n.read ? "font-semibold" : ""}`}>{n.text}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtAgo(n.createdAt)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}