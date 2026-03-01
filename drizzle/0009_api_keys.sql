CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "org_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "key_hash" text NOT NULL UNIQUE,
  "key_hint" text NOT NULL,
  "label" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "last_used_at" timestamp,
  "expires_at" timestamp,
  "revoked_at" timestamp
);
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" ("user_id");
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys" ("key_hash");
