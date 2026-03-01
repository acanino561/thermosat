-- Share links
CREATE TYPE "share_permission" AS ENUM ('view', 'edit');
CREATE TABLE IF NOT EXISTS "share_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "model_id" uuid NOT NULL REFERENCES "thermal_models"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "permission" "share_permission" NOT NULL DEFAULT 'view',
  "token" text NOT NULL UNIQUE,
  "access_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp,
  "revoked_at" timestamp
);
CREATE INDEX "share_links_model_id_idx" ON "share_links" ("model_id");
CREATE INDEX "share_links_token_idx" ON "share_links" ("token");

-- Model comments
CREATE TABLE IF NOT EXISTS "model_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "model_id" uuid NOT NULL REFERENCES "thermal_models"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "parent_id" uuid REFERENCES "model_comments"("id") ON DELETE CASCADE,
  "position_3d" jsonb,
  "node_id" uuid REFERENCES "thermal_nodes"("id") ON DELETE SET NULL,
  "content" text NOT NULL,
  "mentions" jsonb NOT NULL DEFAULT '[]',
  "resolved" boolean NOT NULL DEFAULT false,
  "resolved_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "model_comments_model_id_idx" ON "model_comments" ("model_id");

-- Review status
CREATE TYPE "review_status_type" AS ENUM ('draft', 'in_review', 'approved', 'needs_changes');
CREATE TABLE IF NOT EXISTS "review_statuses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "model_id" uuid NOT NULL REFERENCES "thermal_models"("id") ON DELETE CASCADE,
  "status" "review_status_type" NOT NULL DEFAULT 'draft',
  "changed_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "review_statuses_model_id_idx" ON "review_statuses" ("model_id");
