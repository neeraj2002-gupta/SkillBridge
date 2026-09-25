import type { SwapUser } from "@/data/mockUsers";

export type MatchScore = {
  user: SwapUser;
  // Skills you teach that they want
  iCanTeach: string[];
  // Skills they teach that you want
  iCanLearn: string[];
  perfect: boolean;
  score: number;
};

/**
 * Perfect Match algorithm.
 * For each candidate, compute the intersection between:
 *  - my "teach" set ∩ their "learn" set  (I can teach them)
 *  - their "teach" set ∩ my "learn" set  (they can teach me)
 * A "Perfect Match" requires both directions to have at least one skill.
 */
export function rankMatches(
  me: { teach: string[]; learn: string[] } | null,
  candidates: SwapUser[],
): MatchScore[] {
  const myTeach = new Set((me?.teach ?? []).map(norm));
  const myLearn = new Set((me?.learn ?? []).map(norm));

  return candidates
    .map<MatchScore>((u) => {
      const theirTeach = u.teach.map(norm);
      const theirLearn = u.learn.map(norm);
      const iCanTeach = u.learn.filter((s) => myTeach.has(norm(s)));
      const iCanLearn = u.teach.filter((s) => myLearn.has(norm(s)));
      const perfect = iCanTeach.length > 0 && iCanLearn.length > 0;
      const score = iCanTeach.length + iCanLearn.length + (perfect ? 5 : 0);
      void theirTeach; void theirLearn;
      return { user: u, iCanTeach, iCanLearn, perfect, score };
    })
    .sort((a, b) => b.score - a.score);
}

function norm(s: string) {
  return s.trim().toLowerCase();
}