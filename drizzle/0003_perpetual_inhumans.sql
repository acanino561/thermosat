ALTER TYPE "public"."simulation_status" ADD VALUE 'cancelled';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulation_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"name" text DEFAULT 'Default' NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "simulation_runs" ADD COLUMN "config_id" uuid;--> statement-breakpoint
ALTER TABLE "simulation_runs" ADD COLUMN "progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulation_configs" ADD CONSTRAINT "simulation_configs_model_id_thermal_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."thermal_models"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulation_configs_model_id_idx" ON "simulation_configs" USING btree ("model_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_config_id_simulation_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."simulation_configs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
