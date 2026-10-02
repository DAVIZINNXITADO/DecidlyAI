-- Disable legacy sponsored/rewarded-ad credit RPCs.
-- Existing session records are intentionally preserved.
revoke execute on function public.start_sponsored_reward() from public, anon, authenticated;
revoke execute on function public.claim_sponsored_reward(uuid) from public, anon, authenticated;
