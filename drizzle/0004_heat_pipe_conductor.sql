ALTER TYPE "public"."conductor_type" ADD VALUE 'heat_pipe';--> statement-breakpoint
ALTER TABLE "conductors" ADD COLUMN "conductance_data" jsonb;
