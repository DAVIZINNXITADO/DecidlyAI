-- Keep one feedback vote per user and assistant message so the UI upsert is reliable.
create unique index if not exists message_feedback_user_message_uidx
  on public.message_feedback (user_id, message_id);
