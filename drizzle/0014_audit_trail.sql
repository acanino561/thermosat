CREATE TYPE "audit_action" AS ENUM (
  'project.created', 'project.updated', 'project.deleted',
  'model.created', 'model.updated', 'model.deleted',
  'node.created', 'node.updated', 'node.deleted',
  'conductor.created', 'conductor.updated', 'conductor.deleted',
  'simulation.run', 'simulation.completed',
  'share.created', 'share.revoked',
  'comment.created', 'comment.resolved',
  'review_status.changed',
  'api_key.created', 'api_key.revoked',
  'member.invited', 'member.removed'
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid REFERENCES "organizations"("id") ON DELETE SET NULL,
  "project_id" uuid REFERENCES "projects"("id") ON DELETE SET NULL,
  "model_id" uuid REFERENCES "thermal_models"("id") ON DELETE SET NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "action" "audit_action" NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "before" jsonb,
  "after" jsonb,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "audit_logs_org_id_idx" ON "audit_logs" ("org_id");
CREATE INDEX "audit_logs_project_id_idx" ON "audit_logs" ("project_id");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" ("user_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" ("created_at");
