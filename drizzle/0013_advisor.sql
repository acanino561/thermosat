CREATE TABLE IF NOT EXISTS "advisor_analyses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "model_id" uuid NOT NULL REFERENCES "thermal_models"("id") ON DELETE CASCADE,
  "run_id" uuid REFERENCES "simulation_runs"("id") ON DELETE SET NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "deterministic_findings" jsonb NOT NULL DEFAULT '[]',
  "llm_findings" jsonb,
  "tokens_used" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "advisor_analyses_model_id_idx" ON "advisor_analyses" ("model_id");
CREATE INDEX "advisor_analyses_user_id_idx" ON "advisor_analyses" ("user_id");

CREATE TABLE IF NOT EXISTS "advisor_monthly_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "year_month" text NOT NULL,
  "count" integer NOT NULL DEFAULT 0,
  UNIQUE("user_id", "year_month")
);
