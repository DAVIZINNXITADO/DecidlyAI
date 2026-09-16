-- Store the optional written context behind a like/dislike vote.
alter table public.message_feedback
  add column if not exists comment text;
