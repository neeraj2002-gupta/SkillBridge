import { ArrowRightLeft, Building2, GraduationCap, MapPin, Sparkles, Star, MessageCircle, Briefcase, Zap } from "lucide-react";
import type { SwapUser } from "@/data/mockUsers";

type Props = {
  user: SwapUser;
  onRequest?: (u: SwapUser) => void;
  onMessage?: (u: SwapUser) => void;
  perfect?: boolean;
  iCanTeach?: string[];
  iCanLearn?: string[];
};

export default function Card({ user, onRequest, onMessage, perfect, iCanTeach, iCanLearn }: Props) {
  const handleRequest = () => {
    onRequest?.(user);
  };

  const status = user.user_status;
  const institution = user.institution_name;
  const isStudent = status === "Student";
  const isPro = status === "Working Professional";
  const InstitutionIcon = isStudent ? GraduationCap : Building2;
  const showInstitution = Boolean(institution) && (isStudent || isPro);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-[image:var(--gradient-hero)] opacity-0 transition group-hover:opacity-100" />
      <header className="flex items-start gap-4">
        <img src={user.avatar} alt={user.name} className="h-14 w-14 rounded-2xl border border-border bg-muted" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-base font-semibold">{user.name}</h3>
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-[oklch(0.82_0.16_85)] text-[oklch(0.82_0.16_85)]" />
              {user.rating.toFixed(1)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{user.role}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" /> {user.location}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {perfect && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[image:var(--gradient-hero)] px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-[var(--shadow-elegant)]">
                <Zap className="h-3 w-3" /> Perfect match
              </span>
            )}
            {status && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <Briefcase className="h-3 w-3" /> {status}
              </span>
            )}
            {showInstitution && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <InstitutionIcon className="h-3 w-3" /> {institution}
              </span>
            )}
          </div>
        </div>
      </header>

      <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{user.bio}</p>

      <div className="mt-4 grid gap-2">
        <SkillRow label="Teaches" tone="teach" items={user.teach} />
        <div className="flex justify-center">
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
        </div>
        <SkillRow label="Wants" tone="learn" items={user.learn} />
      </div>

      {(iCanTeach?.length || iCanLearn?.length) && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-[11px] text-foreground">
          {iCanLearn && iCanLearn.length > 0 && (
            <p><span className="font-semibold text-primary">You'd learn:</span> {iCanLearn.join(", ")}</p>
          )}
          {iCanTeach && iCanTeach.length > 0 && (
            <p className="mt-0.5"><span className="font-semibold text-primary">You'd teach:</span> {iCanTeach.join(", ")}</p>
          )}
        </div>
      )}

      <footer className="mt-5 flex gap-2">
        <button
          onClick={handleRequest}
          className="flex-1 rounded-lg bg-[image:var(--gradient-hero)] px-3 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-elegant)] transition hover:opacity-90"
        >
          <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> Request swap</span>
        </button>
        <button
          onClick={() => onMessage?.(user)}
          aria-label="Message"
          className="grid h-10 w-10 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
      </footer>
    </article>
  );
}

function SkillRow({ label, tone, items }: { label: string; tone: "teach" | "learn"; items: string[] }) {
  const colorClass = tone === "teach"
    ? "bg-[color-mix(in_oklab,var(--teach)_18%,transparent)] text-[oklch(0.4_0.13_160)] border-[color-mix(in_oklab,var(--teach)_35%,transparent)]"
    : "bg-[color-mix(in_oklab,var(--learn)_18%,transparent)] text-[oklch(0.42_0.14_50)] border-[color-mix(in_oklab,var(--learn)_35%,transparent)]";
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <span key={s} className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>{s}</span>
        ))}
      </div>
    </div>
  );
}