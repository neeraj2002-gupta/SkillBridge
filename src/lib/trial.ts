export type Entitlement = {
  status: "trial_active" | "trial_expired" | "premium_active" | "free";
  isPremium: boolean;
  trialEndsAt?: string | null;
  remainingDays?: number;
  remainingHours?: number;
  premiumPurchasedAt?: string | null;
};

/**
 * Client-side calculation fallback for 3-Day Trial status if backend is loading
 */
export function getLocalEntitlement(
  createdAtIso?: string | null,
  isPremium?: boolean,
  premiumPurchasedAt?: string | null
): Entitlement {
  if (isPremium) {
    return {
      status: "premium_active",
      isPremium: true,
      premiumPurchasedAt: premiumPurchasedAt || null,
    };
  }

  if (!createdAtIso) {
    return {
      status: "free",
      isPremium: false,
    };
  }

  const createdAt = new Date(createdAtIso);
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const trialEndsAt = new Date(createdAt.getTime() + THREE_DAYS_MS);
  const now = new Date();

  if (now < trialEndsAt) {
    const diffMs = trialEndsAt.getTime() - now.getTime();
    const remainingDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const remainingHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    return {
      status: "trial_active",
      isPremium: false,
      trialEndsAt: trialEndsAt.toISOString(),
      remainingDays,
      remainingHours,
    };
  }

  return {
    status: "trial_expired",
    isPremium: false,
    trialEndsAt: trialEndsAt.toISOString(),
    remainingDays: 0,
    remainingHours: 0,
  };
}

export function formatTrialCountdown(remainingDays?: number, remainingHours?: number): string {
  if (remainingDays !== undefined && remainingDays > 0) {
    return `${remainingDays} day${remainingDays > 1 ? "s" : ""} remaining`;
  }
  if (remainingHours !== undefined && remainingHours > 0) {
    return `${remainingHours} hour${remainingHours > 1 ? "s" : ""} remaining`;
  }
  return "Trial ending soon";
}

export function formatDate(isoDate?: string | null): string {
  if (!isoDate) return "N/A";
  try {
    return new Date(isoDate).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}
