CREATE TABLE IF NOT EXISTS "sso_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL UNIQUE REFERENCES "organizations"("id") ON DELETE CASCADE,
  "entity_id" text NOT NULL,
  "sso_url" text NOT NULL,
  "certificate" text NOT NULL,
  "metadata_url" text,
  "domain_enforced" boolean NOT NULL DEFAULT false,
  "enabled" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "sso_configs_org_id_idx" ON "sso_configs" ("org_id");
