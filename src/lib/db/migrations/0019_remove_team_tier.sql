-- Migrate any existing 'team' subscriptions to 'pro'
UPDATE subscriptions SET tier = 'pro' WHERE tier = 'team';
-- Note: pgEnum removal requires recreating the enum type; handled by Drizzle schema sync
