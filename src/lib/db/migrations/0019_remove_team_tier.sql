-- Migrate any existing 'team' subscriptions to 'pro'
UPDATE subscriptions SET tier = 'pro' WHERE tier = 'team';

-- Recreate subscription_tier enum without 'team'
ALTER TYPE subscription_tier RENAME TO subscription_tier_old;
CREATE TYPE subscription_tier AS ENUM ('free', 'academic', 'starter', 'pro', 'enterprise');
ALTER TABLE subscriptions ALTER COLUMN tier TYPE subscription_tier USING tier::text::subscription_tier;
DROP TYPE subscription_tier_old;
