// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getLocalEntitlement, type Entitlement } from "@/lib/trial";

export type Profile = {
  id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  bio: string;
  role: string;
  location: string;
  category: string;
  rating: number;
  user_status: string;
  institution_name: string | null;
  id_number: string | null;
  is_premium?: boolean;
  created_at?: string;
  premium_purchased_at?: string | null;
};

type AuthCtx = {
  user: SupabaseUser | null;
  session: Session | null;
  profile: Profile | null;
  entitlement: Entitlement;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  register: (
    name: string,
    email: string,
    password: string,
    extras?: { user_status?: string; institution_name?: string; id_number?: string }
  ) => Promise<{ error: Error | null }>;
  loginWithGoogle: () => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshEntitlement: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement>({ status: "free", isPremium: false });
  const [loading, setLoading] = useState(true);

  const fetchBackendEntitlement = async (userId: string, p: Profile | null) => {
    try {
      const serverUrl = (import.meta.env.VITE_SOCKET_URL as string) || "http://localhost:5000";
      const res = await fetch(`${serverUrl}/api/entitlement/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setEntitlement(data);
        return;
      }
    } catch {
      // Backend offline fallback: calculate local entitlement based on profile created_at
    }

    if (p) {
      setEntitlement(
        getLocalEntitlement(p.created_at || user?.created_at, p.is_premium, p.premium_purchased_at)
      );
    } else {
      setEntitlement({ status: "free", isPremium: false });
    }
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const p = data ? (data as Profile) : null;
    setProfile(p);
    fetchBackendEntitlement(userId, p);
  };

  useEffect(() => {
    // 1) Subscribe FIRST so we never miss an event
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setTimeout(() => { loadProfile(newSession.user.id); }, 0);
      } else {
        setProfile(null);
        setEntitlement({ status: "free", isPremium: false });
      }
    });

    // 2) Then read existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) loadProfile(existing.user.id);
      setLoading(false);
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user,
    session,
    profile,
    entitlement,
    loading,

    login: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ?? null };
    },

    register: async (name, email, password, extras) => {
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: name,
            user_status: extras?.user_status ?? "Other",
            institution_name: extras?.institution_name ?? "",
            id_number: extras?.id_number ?? "",
          },
        },
      });
      return { error: error ?? null };
    },

    loginWithGoogle: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      return { error: error ?? null };
    },

    logout: async () => {
      await supabase.auth.signOut();
      setEntitlement({ status: "free", isPremium: false });
    },

    refreshProfile: async () => {
      if (user) await loadProfile(user.id);
    },

    refreshEntitlement: async () => {
      if (user) await fetchBackendEntitlement(user.id, profile);
    },
  }), [user, session, profile, entitlement, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}