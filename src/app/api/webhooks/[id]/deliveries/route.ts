import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { webhooks, webhookDeliveries } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    // Verify ownership
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, id), eq(webhooks.userId, user.id)));

    if (!webhook) return notFoundResponse('Webhook');

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const deliveries = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, id))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ deliveries, page, limit });
  } catch (error) {
    console.error('GET /api/webhooks/[id]/deliveries error:', error);
    return serverErrorResponse();
  }
}
