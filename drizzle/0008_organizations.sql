-- Organizations + Team Workspaces + RBAC
-- New enums
CREATE TYPE "org_role" AS ENUM ('owner', 'admin', 'member');
CREATE TYPE "team_role" AS ENUM ('admin', 'editor', 'viewer');

-- Organizations
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "logo_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Organization members
CREATE TABLE IF NOT EXISTS "org_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "org_role" NOT NULL DEFAULT 'member',
  "invited_at" timestamp DEFAULT now() NOT NULL,
  "joined_at" timestamp
);

CREATE INDEX "org_members_org_id_idx" ON "org_members" ("org_id");
CREATE INDEX "org_members_user_id_idx" ON "org_members" ("user_id");
CREATE UNIQUE INDEX "org_members_org_user_idx" ON "org_members" ("org_id", "user_id");

-- Teams
CREATE TABLE IF NOT EXISTS "teams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "teams_org_id_idx" ON "teams" ("org_id");

-- Team members
CREATE TABLE IF NOT EXISTS "team_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" "team_role" NOT NULL DEFAULT 'viewer',
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "team_members_team_id_idx" ON "team_members" ("team_id");
CREATE INDEX "team_members_user_id_idx" ON "team_members" ("user_id");
CREATE UNIQUE INDEX "team_members_team_user_idx" ON "team_members" ("team_id", "user_id");

-- Team projects
CREATE TABLE IF NOT EXISTS "team_projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "team_projects_team_id_idx" ON "team_projects" ("team_id");
CREATE INDEX "team_projects_project_id_idx" ON "team_projects" ("project_id");
CREATE UNIQUE INDEX "team_projects_team_project_idx" ON "team_projects" ("team_id", "project_id");

-- Add org_id to projects (nullable for personal projects)
ALTER TABLE "projects" ADD COLUMN "org_id" uuid REFERENCES "organizations"("id") ON DELETE SET NULL;
CREATE INDEX "projects_org_id_idx" ON "projects" ("org_id");
