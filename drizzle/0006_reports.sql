DO $$ BEGIN
  CREATE TYPE "report_status" AS ENUM ('generating', 'complete', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "result_id" uuid NOT NULL REFERENCES "simulation_runs"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "model_id" uuid NOT NULL REFERENCES "thermal_models"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" "report_status" DEFAULT 'generating' NOT NULL,
  "error_message" text,
  "pdf_buffer" bytea,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS "reports_result_id_idx" ON "reports" ("result_id");
CREATE INDEX IF NOT EXISTS "reports_user_id_idx" ON "reports" ("user_id");
