-- ============================================
-- Add Upvotes to Doubt Threads and Messages
-- ============================================

ALTER TABLE doubt_threads ADD COLUMN IF NOT EXISTS upvote_count INT NOT NULL DEFAULT 0;
ALTER TABLE doubt_messages ADD COLUMN IF NOT EXISTS upvote_count INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS doubt_thread_upvotes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id    UUID NOT NULL REFERENCES doubt_threads(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS doubt_message_upvotes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id   UUID NOT NULL REFERENCES doubt_messages(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_doubt_thread_upvotes_thread_id ON doubt_thread_upvotes(thread_id);
CREATE INDEX IF NOT EXISTS idx_doubt_message_upvotes_message_id ON doubt_message_upvotes(message_id);

ALTER TABLE doubt_thread_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_message_upvotes ENABLE ROW LEVEL SECURITY;
