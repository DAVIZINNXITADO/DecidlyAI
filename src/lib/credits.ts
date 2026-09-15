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

export function effectiveDailyUsed(wallet: Pick<CreditWallet, "daily_credits_used" | "daily_credits_reset_at">): number {
  return wallet.daily_credits_reset_at === todayInSaoPaulo() ? wallet.daily_credits_used : 0;
}

export function availableCredits(wallet: CreditWallet): number {
  const dailyUsed = effectiveDailyUsed(wallet);
  return Math.max(0, wallet.daily_credits_limit - dailyUsed) + wallet.free_credits + wallet.purchased_credits;
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
