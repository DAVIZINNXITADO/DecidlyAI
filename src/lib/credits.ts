export type CreditWallet = {
  free_credits: number;
  purchased_credits: number;
  total_credits: number;
  daily_credits_used: number;
  daily_credits_limit: number;
  daily_credits_reset_at: string | null;
};

export function todayInSaoPaulo(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dailyCreditsBalance(wallet: Pick<CreditWallet, "daily_credits_used" | "daily_credits_limit" | "daily_credits_reset_at">): number {
  const today = todayInSaoPaulo();
  if (!wallet.daily_credits_reset_at) return Math.min(wallet.daily_credits_limit, 5);
  if (wallet.daily_credits_reset_at >= today) return Math.min(wallet.daily_credits_limit, wallet.daily_credits_used);

  const previous = Date.parse(`${wallet.daily_credits_reset_at.slice(0, 10)}T00:00:00Z`);
  const current = Date.parse(`${today}T00:00:00Z`);
  const elapsedDays = Math.max(1, Math.floor((current - previous) / 86_400_000));
  const dailyGrant = wallet.daily_credits_limit >= 100 ? 10 : 5;
  return Math.min(wallet.daily_credits_limit, wallet.daily_credits_used + elapsedDays * dailyGrant);
}

export const effectiveDailyUsed = dailyCreditsBalance;

export function availableCredits(wallet: CreditWallet): number {
  return dailyCreditsBalance(wallet) + wallet.free_credits + wallet.purchased_credits;
}

export function normalizeCreditWallet(data: Partial<CreditWallet> | null | undefined): CreditWallet {
  return {
    free_credits: Number(data?.free_credits ?? 0),
    purchased_credits: Number(data?.purchased_credits ?? 0),
    total_credits: Number(data?.total_credits ?? 0),
    daily_credits_used: Number(data?.daily_credits_used ?? 0),
    daily_credits_limit: Number(data?.daily_credits_limit ?? 10),
    daily_credits_reset_at: data?.daily_credits_reset_at ? String(data.daily_credits_reset_at) : null,
  };
}
