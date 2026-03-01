CREATE TYPE "failure_type" AS ENUM (
  'heater_failure',
  'mli_degradation',
  'coating_degradation_eol',
  'attitude_loss_tumble',
  'power_budget_reduction',
  'conductor_failure',
  'component_power_spike'
);

CREATE TYPE "analysis_status" AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS "failure_analyses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "model_id" uuid NOT NULL REFERENCES "thermal_models"("id") ON DELETE CASCADE,
  "base_run_id" uuid REFERENCES "simulation_runs"("id") ON DELETE SET NULL,
  "status" "analysis_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp
);
CREATE INDEX "failure_analyses_model_id_idx" ON "failure_analyses" ("model_id");

CREATE TABLE IF NOT EXISTS "failure_cases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "analysis_id" uuid NOT NULL REFERENCES "failure_analyses"("id") ON DELETE CASCADE,
  "failure_type" "failure_type" NOT NULL,
  "label" text,
  "params" jsonb NOT NULL DEFAULT '{}',
  "run_id" uuid REFERENCES "simulation_runs"("id") ON DELETE SET NULL,
  "status" "analysis_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "failure_cases_analysis_id_idx" ON "failure_cases" ("analysis_id");
