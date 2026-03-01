CREATE TYPE "exploration_status" AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS "design_explorations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "model_id" uuid NOT NULL REFERENCES "thermal_models"("id") ON DELETE CASCADE,
  "config" jsonb NOT NULL,
  "status" "exploration_status" DEFAULT 'pending' NOT NULL,
  "num_samples" integer NOT NULL,
  "completed_samples" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp
);
CREATE INDEX "design_explorations_model_id_idx" ON "design_explorations" ("model_id");

CREATE TABLE IF NOT EXISTS "exploration_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "exploration_id" uuid NOT NULL REFERENCES "design_explorations"("id") ON DELETE CASCADE,
  "sample_index" integer NOT NULL,
  "param_values" jsonb NOT NULL,
  "node_results" jsonb NOT NULL,
  "feasible" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "exploration_results_exploration_id_idx" ON "exploration_results" ("exploration_id");
