ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS sim_runs_used integer NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS sim_runs_reset_at timestamp;
