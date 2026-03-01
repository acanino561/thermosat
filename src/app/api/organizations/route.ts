import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { organizations, orgMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  validationErrorResponse,
  serverErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api-helpers';

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  logoUrl: z.string().url().optional(),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    // List orgs the user is a member of
    const memberships = await db
      .select({
        org: organizations,
        role: orgMembers.role,
        joinedAt: orgMembers.joinedAt,
      })
      .from(orgMembers)
      .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
      .where(eq(orgMembers.userId, user.id));

    return NextResponse.json({
      data: memberships.map((m) => ({
        ...m.org,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (error) {
    console.error('GET /api/organizations error:', error);
    return serverErrorResponse();
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = createOrgSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const slug = parsed.data.slug || slugify(parsed.data.name);

    // Check slug uniqueness
    const [existing] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug));
    if (existing) {
      return NextResponse.json(
        { error: 'An organization with this slug already exists' },
        { status: 409 },
      );
    }

    const [org] = await db
      .insert(organizations)
      .values({
        name: parsed.data.name,
        slug,
        logoUrl: parsed.data.logoUrl ?? null,
      })
      .returning();

    // Add creator as owner
    await db.insert(orgMembers).values({
      orgId: org.id,
      userId: user.id,
      role: 'owner',
      joinedAt: new Date(),
    });

    return NextResponse.json({ data: org }, { status: 201 });
  } catch (error) {
    console.error('POST /api/organizations error:', error);
    return serverErrorResponse();
  }
}
