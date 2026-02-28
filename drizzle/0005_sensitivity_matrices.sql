DO $$ BEGIN
  CREATE TYPE "public"."sensitivity_status" AS ENUM('pending', 'running', 'complete', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sensitivity_matrices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "run_id" uuid NOT NULL,
  "status" "sensitivity_status" DEFAULT 'pending' NOT NULL,
  "computed_at" timestamp,
  "entries" jsonb,
  "error_message" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sensitivity_matrices" ADD CONSTRAINT "sensitivity_matrices_run_id_simulation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."simulation_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sensitivity_matrices_run_id_idx" ON "sensitivity_matrices" USING btree ("run_id");
