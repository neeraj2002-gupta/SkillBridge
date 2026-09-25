import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, Building2, Camera, IdCard, Plus, Save, Trash2, User as UserIcon, Sparkles, Gift, Clock, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatTrialCountdown, formatDate } from "@/lib/trial";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — SkillBridge" }, { name: "description", content: "Edit your profile and skills." }] }),
  component: Profile,
});

function Profile() {
  const { user, profile, entitlement, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [userStatus, setUserStatus] = useState("Other");
  const [institutionName, setInstitutionName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [have, setHave] = useState<string[]>([]);
  const [want, setWant] = useState<string[]>([]);
  const [haveDraft, setHaveDraft] = useState("");
  const [wantDraft, setWantDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local form state when profile loads/changes
  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name);
    setBio(profile.bio);
    setRole(profile.role);
    setLocation(profile.location);
    setUserStatus(profile.user_status || "Other");
    setInstitutionName(profile.institution_name || "");
    setIdNumber(profile.id_number || "");
  }, [profile]);

  // Load skills for current user
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("name, type")
        .eq("user_id", user.id);
      if (cancelled) return;
      if (error) {
        toast.error("Could not load your skills");
        return;
      }
      setHave((data ?? []).filter((s) => s.type === "teach").map((s) => s.name));
      setWant((data ?? []).filter((s) => s.type === "learn").map((s) => s.name));
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Sign in to edit your profile</h1>
        <Link to="/login" className="mt-6 inline-flex rounded-xl bg-[image:var(--gradient-hero)] px-5 py-2.5 text-sm font-semibold text-primary-foreground">Sign in</Link>
      </div>
    );
  }

  const addSkill = async (kind: "have" | "want") => {
    const v = (kind === "have" ? haveDraft : wantDraft).trim();
    if (!v) return;
    const type = kind === "have" ? "teach" : "learn";
    const { error } = await supabase
      .from("skills")
      .insert({ user_id: user.id, name: v, type });
    if (error) {
      if (error.code === "23505") toast.message("You already added that skill");
      else toast.error(error.message);
      return;
    }
    if (kind === "have") { setHave((s) => Array.from(new Set([...s, v]))); setHaveDraft(""); }
    else { setWant((s) => Array.from(new Set([...s, v]))); setWantDraft(""); }
    toast.success(`"${v}" skill saved!`);
  };

  const removeSkill = async (kind: "have" | "want", v: string) => {
    const type = kind === "have" ? "teach" : "learn";
    const { error } = await supabase
      .from("skills")
      .delete()
      .eq("user_id", user.id)
      .eq("name", v)
      .eq("type", type);
    if (error) { toast.error(error.message); return; }
    if (kind === "have") setHave((s) => s.filter((x) => x !== v));
    else setWant((s) => s.filter((x) => x !== v));
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setAvatarUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    // path inside the 'avatars' bucket — no bucket name prefix here
    const path = `${user.id}.${ext}`;
    // Show instant preview
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    // Upload to 'avatars' bucket
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      toast.error("Upload failed: " + upErr.message);
      setAvatarUploading(false);
      return;
    }
    // Get public URL with cache-bust so browser shows new image on reload
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    // Save URL to profile
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);
    setAvatarUploading(false);
    if (updateErr) {
      console.error("Avatar DB update error:", updateErr);
      toast.error("Could not save avatar to profile: " + updateErr.message);
      return;
    }
    toast.success("Profile picture updated! 📸");
    await refreshProfile();
  };

  const save = async () => {
    setSaving(true);

    // Auto-save any unsaved skill drafts so the user doesn't lose them
    if (haveDraft.trim()) await addSkill("have");
    if (wantDraft.trim()) await addSkill("want");

    // Use upsert keyed on `id` so the call works whether or not the row
    // already exists (handles edge cases where the auth trigger missed).
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          display_name: name,
          email: user.email ?? null,
          bio,
          role,
          location,
          user_status: userStatus,
          institution_name: institutionName.trim() || null,
          id_number: idNumber.trim() || null,
        },
        { onConflict: "id" },
      );
    setSaving(false);
    if (error) {
      toast.error("Could not save profile", { description: error.message });
      return;
    }
    toast.success("Profile saved", { description: "Your changes are live." });
    await refreshProfile();
  };

  const avatarUrl = avatarPreview || profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.display_name || user.email}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <header className="flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        {/* Avatar with upload overlay */}
        <div className="relative shrink-0 cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
          <img src={avatarUrl} alt={profile?.display_name ?? "You"} className="h-20 w-20 rounded-2xl border border-border bg-muted object-cover" />
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            {avatarUploading
              ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              : <Camera className="h-6 w-6 text-white" />}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }}
          />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Edit profile</h1>
          <p className="text-sm text-muted-foreground">Click your avatar to change your profile picture.</p>
        </div>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[image:var(--gradient-hero)] px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] hover:opacity-90 disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
        </button>
      </header>

      {/* Premium & Trial Status Card */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`grid h-12 w-12 place-items-center rounded-2xl ${
              entitlement.status === "premium_active"
                ? "bg-primary/10 text-primary"
                : entitlement.status === "trial_active"
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-amber-500/15 text-amber-500"
            }`}>
              {entitlement.status === "premium_active" ? (
                <ShieldCheck className="h-6 w-6" />
              ) : entitlement.status === "trial_active" ? (
                <Gift className="h-6 w-6" />
              ) : (
                <Clock className="h-6 w-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  {entitlement.status === "premium_active" && "⭐ SkillBridge Premium"}
                  {entitlement.status === "trial_active" && "🎁 3-Day Free Trial"}
                  {entitlement.status === "trial_expired" && "Free Account"}
                  {entitlement.status === "free" && "Free Account"}
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  entitlement.status === "premium_active"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : entitlement.status === "trial_active"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {entitlement.status === "premium_active" && "Lifetime Access Active"}
                  {entitlement.status === "trial_active" && formatTrialCountdown(entitlement.remainingDays, entitlement.remainingHours)}
                  {entitlement.status === "trial_expired" && "Free Trial Expired"}
                  {entitlement.status === "free" && "Basic Tier"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {entitlement.status === "premium_active" && `Purchased on: ${formatDate(entitlement.premiumPurchasedAt || profile?.premium_purchased_at)}`}
                {entitlement.status === "trial_active" && "Explore all premium features free for 3 days. No credit card required."}
                {entitlement.status === "trial_expired" && "Your 3-day free trial has ended. Upgrade to Lifetime Premium for ₹99."}
                {entitlement.status === "free" && "Upgrade to Lifetime Premium for a one-time ₹99 payment."}
              </p>
            </div>
          </div>

          {entitlement.status !== "premium_active" && (
            <Link
              to="/premium"
              className="inline-flex items-center gap-2 rounded-xl bg-[image:var(--gradient-hero)] px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-[var(--shadow-elegant)] hover:opacity-90 transition"
            >
              <Sparkles className="h-4 w-4" /> Upgrade to Lifetime Premium – ₹99
            </Link>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] md:col-span-2">
          <h2 className="flex items-center gap-2 text-base font-semibold"><UserIcon className="h-4 w-4 text-primary" /> About you</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Display name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Email</span>
              <input value={user.email ?? ""} disabled className="w-full rounded-xl border border-input bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Role / Title</span>
              <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Frontend Engineer" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Location</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bengaluru, IN" className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Current status</span>
              <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <select
                  value={userStatus}
                  onChange={(e) => setUserStatus(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                >
                  <option value="Student">Student</option>
                  <option value="Working Professional">Working Professional</option>
                  <option value="Self-Employed">Self-Employed</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                {userStatus === "Student" ? "University name (optional)" : userStatus === "Working Professional" ? "Company / Organization (optional)" : "Institution / Organization (optional)"}
              </span>
              <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <input
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder={userStatus === "Student" ? "e.g. IIT Bombay" : "e.g. Acme Corp"}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">ID number (optional)</span>
              <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <IdCard className="h-4 w-4 text-muted-foreground" />
                <input
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Student / Employee ID"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </label>
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Bio</span>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </label>
        </div>

        <SkillEditor title="Skills I can teach" tone="teach" items={have} draft={haveDraft} setDraft={setHaveDraft} onAdd={() => addSkill("have")} onRemove={(v) => removeSkill("have", v)} />
        <SkillEditor title="Skills I want to learn" tone="learn" items={want} draft={wantDraft} setDraft={setWantDraft} onAdd={() => addSkill("want")} onRemove={(v) => removeSkill("want", v)} />
      </section>
    </div>
  );
}

function SkillEditor({ title, tone, items, draft, setDraft, onAdd, onRemove }: {
  title: string; tone: "teach" | "learn"; items: string[]; draft: string; setDraft: (v: string) => void; onAdd: () => void; onRemove: (v: string) => void;
}) {
  const chip = tone === "teach"
    ? "bg-[color-mix(in_oklab,var(--teach)_18%,transparent)] text-[oklch(0.4_0.13_160)] border-[color-mix(in_oklab,var(--teach)_30%,transparent)]"
    : "bg-[color-mix(in_oklab,var(--learn)_18%,transparent)] text-[oklch(0.42_0.14_50)] border-[color-mix(in_oklab,var(--learn)_30%,transparent)]";
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <h2 className="text-base font-semibold">{title}</h2>
      <form
        onSubmit={(e) => { e.preventDefault(); onAdd(); }}
        className="mt-4 flex items-center gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. React, OOP, Care Plans…"
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button type="submit" className="grid h-10 w-10 place-items-center rounded-xl bg-[image:var(--gradient-hero)] text-primary-foreground">
          <Plus className="h-4 w-4" />
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.length === 0 && <p className="text-xs text-muted-foreground">No skills yet — add one above.</p>}
        {items.map((s) => (
          <span key={s} className={`group inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium ${chip}`}>
            {s}
            <button onClick={() => onRemove(s)} className="opacity-60 hover:opacity-100" aria-label={`Remove ${s}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}