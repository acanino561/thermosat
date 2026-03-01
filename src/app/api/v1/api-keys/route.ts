import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { apiKeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generateApiKey } from '@/lib/auth/api-key';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  validationErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api-helpers';

const createApiKeySchema = z.object({
  label: z.string().min(1).max(200),
  expiresAt: z.string().datetime().optional(),
});

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const keys = await db
      .select({
        id: apiKeys.id,
        label: apiKeys.label,
        keyHint: apiKeys.keyHint,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        revokedAt: apiKeys.revokedAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, user.id));

    return NextResponse.json({ data: keys });
  } catch (error) {
    console.error('GET /api/v1/api-keys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const body = await parseJsonBody(request);
    if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

    const parsed = createApiKeySchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const { plaintext, hash, hint } = generateApiKey();

    const [key] = await db
      .insert(apiKeys)
      .values({
        userId: user.id,
        keyHash: hash,
        keyHint: hint,
        label: parsed.data.label,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          id: key.id,
          label: key.label,
          keyHint: key.keyHint,
          plaintext, // shown ONCE
          createdAt: key.createdAt,
          expiresAt: key.expiresAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/v1/api-keys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
