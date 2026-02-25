CREATE TYPE "public"."conductor_type" AS ENUM('linear', 'radiation', 'contact');--> statement-breakpoint
CREATE TYPE "public"."heat_load_type" AS ENUM('constant', 'time_varying', 'orbital');--> statement-breakpoint
CREATE TYPE "public"."material_category" AS ENUM('metal', 'composite', 'mli', 'paint', 'osr', 'adhesive');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('diffusion', 'arithmetic', 'boundary');--> statement-breakpoint
CREATE TYPE "public"."simulation_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."simulation_type" AS ENUM('transient', 'steady_state');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conductors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"name" text NOT NULL,
	"conductor_type" "conductor_type" NOT NULL,
	"node_from_id" uuid NOT NULL,
	"node_to_id" uuid NOT NULL,
	"conductance" double precision,
	"area" double precision,
	"view_factor" double precision,
	"emissivity" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "heat_loads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"node_id" uuid NOT NULL,
	"name" text NOT NULL,
	"load_type" "heat_load_type" NOT NULL,
	"value" double precision,
	"time_values" jsonb,
	"orbital_params" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" "material_category" NOT NULL,
	"absorptivity" double precision NOT NULL,
	"emissivity" double precision NOT NULL,
	"conductivity" double precision NOT NULL,
	"specific_heat" double precision NOT NULL,
	"density" double precision NOT NULL,
	"temp_range_min" double precision NOT NULL,
	"temp_range_max" double precision NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"user_id" uuid,
	"project_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "model_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulation_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"node_id" uuid NOT NULL,
	"time_values" jsonb NOT NULL,
	"conductor_flows" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"status" "simulation_status" DEFAULT 'pending' NOT NULL,
	"simulation_type" "simulation_type" NOT NULL,
	"config" jsonb NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"energy_balance_error" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "thermal_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"orbital_config" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "thermal_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"name" text NOT NULL,
	"node_type" "node_type" NOT NULL,
	"temperature" double precision NOT NULL,
	"capacitance" double precision,
	"boundary_temp" double precision,
	"material_id" uuid,
	"area" double precision,
	"mass" double precision,
	"absorptivity" double precision,
	"emissivity" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conductors" ADD CONSTRAINT "conductors_model_id_thermal_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."thermal_models"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conductors" ADD CONSTRAINT "conductors_node_from_id_thermal_nodes_id_fk" FOREIGN KEY ("node_from_id") REFERENCES "public"."thermal_nodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conductors" ADD CONSTRAINT "conductors_node_to_id_thermal_nodes_id_fk" FOREIGN KEY ("node_to_id") REFERENCES "public"."thermal_nodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "heat_loads" ADD CONSTRAINT "heat_loads_model_id_thermal_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."thermal_models"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "heat_loads" ADD CONSTRAINT "heat_loads_node_id_thermal_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."thermal_nodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "materials" ADD CONSTRAINT "materials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "materials" ADD CONSTRAINT "materials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "model_snapshots" ADD CONSTRAINT "model_snapshots_model_id_thermal_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."thermal_models"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulation_results" ADD CONSTRAINT "simulation_results_run_id_simulation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."simulation_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulation_results" ADD CONSTRAINT "simulation_results_node_id_thermal_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."thermal_nodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_model_id_thermal_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."thermal_models"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "thermal_models" ADD CONSTRAINT "thermal_models_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "thermal_nodes" ADD CONSTRAINT "thermal_nodes_model_id_thermal_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."thermal_models"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "thermal_nodes" ADD CONSTRAINT "thermal_nodes_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conductors_model_id_idx" ON "conductors" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "heat_loads_model_id_idx" ON "heat_loads" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "materials_is_default_idx" ON "materials" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "materials_user_id_idx" ON "materials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "model_snapshots_model_id_idx" ON "model_snapshots" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulation_results_run_id_idx" ON "simulation_results" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulation_runs_model_id_idx" ON "simulation_runs" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "thermal_models_project_id_idx" ON "thermal_models" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "thermal_nodes_model_id_idx" ON "thermal_nodes" USING btree ("model_id");