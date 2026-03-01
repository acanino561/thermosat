import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { shareLinks, thermalModels } from '@/lib/db/schema';
import { eq, sql, isNull, or, gt } from 'drizzle-orm';
import { and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { token } = await params;

    const [link] = await db
      .select()
      .from(shareLinks)
      .where(
        and(
          eq(shareLinks.token, token),
          isNull(shareLinks.revokedAt),
          or(isNull(shareLinks.expiresAt), gt(shareLinks.expiresAt, new Date())),
        ),
      );

    if (!link) {
      return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 });
    }

    // Increment access count
    await db
      .update(shareLinks)
      .set({ accessCount: sql`${shareLinks.accessCount} + 1` })
      .where(eq(shareLinks.id, link.id));

    const [model] = await db.select().from(thermalModels).where(eq(thermalModels.id, link.modelId));

    return NextResponse.json({
      data: {
        shareLink: { permission: link.permission, modelId: link.modelId },
        model: model ? { id: model.id, name: model.name, description: model.description } : null,
      },
    });
  } catch (error) {
    console.error('GET /api/share/[token] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
