import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db/client';
import { projects, thermalModels } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { ZodError } from 'zod';

// ── Session & Auth ─────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as AuthenticatedUser;
  if (!user.id) return null;
  return user;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export function notFoundResponse(resource: string): NextResponse {
  return NextResponse.json(
    { error: `${resource} not found` },
    { status: 404 },
  );
}

export function validationErrorResponse(error: ZodError): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation failed',
      details: error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    },
    { status: 400 },
  );
}

export function serverErrorResponse(message: string = 'Internal server error'): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 });
}

// ── Ownership Verification ──────────────────────────────────────────────────

export async function verifyProjectOwnership(
  projectId: string,
  userId: string,
): Promise<typeof projects.$inferSelect | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  return project ?? null;
}

export async function verifyModelOwnership(
  modelId: string,
  projectId: string,
): Promise<typeof thermalModels.$inferSelect | null> {
  const [model] = await db
    .select()
    .from(thermalModels)
    .where(
      and(
        eq(thermalModels.id, modelId),
        eq(thermalModels.projectId, projectId),
      ),
    );
  return model ?? null;
}

// ── Request Body Parsing ────────────────────────────────────────────────────

export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    const body = (await request.json()) as T;
    return body;
  } catch {
    return null;
  }
}
