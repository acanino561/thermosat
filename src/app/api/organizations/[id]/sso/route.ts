import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { organizations, orgMembers, ssoConfigs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ssoConfigSchema = z.object({
  entityId: z.string().min(1),
  ssoUrl: z.string().url(),
  certificate: z.string().min(1),
  metadataUrl: z.string().url().optional().nullable(),
  allowedDomains: z.array(z.string()).optional(),
  domainEnforced: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

async function requireOrgAdmin(userId: string, orgId: string) {
  const [caller] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
  if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
    return false;
  }
  return true;
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (!(await requireOrgAdmin(user.id, id))) return forbiddenResponse();

    // Join with organizations to include orgSlug
    const [result] = await db
      .select({
        id: ssoConfigs.id,
        orgId: ssoConfigs.orgId,
        entityId: ssoConfigs.entityId,
        ssoUrl: ssoConfigs.ssoUrl,
        certificate: ssoConfigs.certificate,
        metadataUrl: ssoConfigs.metadataUrl,
        allowedDomains: ssoConfigs.allowedDomains,
        domainEnforced: ssoConfigs.domainEnforced,
        enabled: ssoConfigs.enabled,
        createdAt: ssoConfigs.createdAt,
        updatedAt: ssoConfigs.updatedAt,
        orgSlug: organizations.slug,
      })
      .from(ssoConfigs)
      .innerJoin(organizations, eq(ssoConfigs.orgId, organizations.id))
      .where(eq(ssoConfigs.orgId, id));

    return NextResponse.json({ data: result ?? null });
  } catch (error) {
    console.error('GET /api/organizations/[id]/sso error:', error);
    return serverErrorResponse();
  }
}

export async function PUT(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (!(await requireOrgAdmin(user.id, id))) return forbiddenResponse();

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = ssoConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const values = {
      orgId: id,
      entityId: parsed.data.entityId,
      ssoUrl: parsed.data.ssoUrl,
      certificate: parsed.data.certificate,
      metadataUrl: parsed.data.metadataUrl ?? null,
      allowedDomains: parsed.data.allowedDomains ?? [],
      domainEnforced: parsed.data.domainEnforced ?? false,
      enabled: parsed.data.enabled ?? false,
      updatedAt: new Date(),
    };

    // Upsert
    const [existing] = await db
      .select()
      .from(ssoConfigs)
      .where(eq(ssoConfigs.orgId, id));

    let result;
    if (existing) {
      [result] = await db
        .update(ssoConfigs)
        .set(values)
        .where(eq(ssoConfigs.orgId, id))
        .returning();
    } else {
      [result] = await db.insert(ssoConfigs).values(values).returning();
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('PUT /api/organizations/[id]/sso error:', error);
    return serverErrorResponse();
  }
}
