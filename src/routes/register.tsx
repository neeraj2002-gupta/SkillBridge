import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { UserPlus, User as UserIcon, Mail, Lock, Briefcase, Building2, IdCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Join — SkillBridge" }, { name: "description", content: "Create your SkillBridge account and start bridging skills." }] }),
  component: Register,
});

function Register() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userStatus, setUserStatus] = useState("Student");
  const [institutionName, setInstitutionName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await register(name || "New Learner", email, password, {
      user_status: userStatus,
      institution_name: institutionName.trim(),
      id_number: idNumber.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Could not create account");
      return;
    }
    toast.success("Account created! Check your email to confirm if needed.");
    navigate({ to: "/profile" });
  };

  const onGoogle = async () => {
    const { error } = await loginWithGoogle();
    if (error) toast.error(error.message || "Google sign-in failed");
  };

  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center bg-[image:var(--gradient-soft)] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[image:var(--gradient-hero)] text-primary-foreground">
            <UserPlus className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Join SkillBridge</h1>
          <p className="mt-1 text-sm text-muted-foreground">Free forever. No credit card.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field icon={UserIcon} type="text" value={name} onChange={setName} placeholder="Aarav Sharma" label="Full name" />
          <Field icon={Mail} type="email" value={email} onChange={setEmail} placeholder="you@example.com" label="Email" />
          <Field icon={Lock} type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" label="Password" />
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
          {(userStatus === "Student" || userStatus === "Working Professional") && (
            <Field
              icon={Building2}
              type="text"
              value={institutionName}
              onChange={setInstitutionName}
              placeholder={userStatus === "Student" ? "e.g. IIT Bombay" : "e.g. Acme Corp"}
              label={userStatus === "Student" ? "University name (optional)" : "Company / Organization (optional)"}
              required={false}
            />
          )}
          <Field
            icon={IdCard}
            type="text"
            value={idNumber}
            onChange={setIdNumber}
            placeholder="Student / Employee ID"
            label="ID number (optional)"
            required={false}
          />
          <button disabled={submitting} className="w-full rounded-xl bg-[image:var(--gradient-hero)] px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition hover:opacity-90 disabled:opacity-60">
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>
        <button
          type="button"
          onClick={onGoogle}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-muted"
        >
          <GoogleIcon /> Continue with Google
        </button>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already a member? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.95l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}

function Field({ icon: Icon, label, type, value, onChange, placeholder, required = true }: { icon: typeof Mail; label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none"
          required={required}
        />
      </div>
    </label>
  );
}