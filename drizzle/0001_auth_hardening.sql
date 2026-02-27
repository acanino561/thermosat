-- Auth hardening: add user profile fields, soft delete, password support, and password reset tokens
DO $$ BEGIN
  CREATE TYPE "public"."units_pref" AS ENUM('si', 'imperial');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."temp_unit" AS ENUM('K', 'C', 'F');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "organization" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role_title" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "units_pref" "units_pref" DEFAULT 'si';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "temp_unit" "temp_unit" DEFAULT 'K';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL,
  CONSTRAINT "password_reset_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
