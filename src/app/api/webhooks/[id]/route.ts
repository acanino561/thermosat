import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { webhooks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api-helpers';
import { WEBHOOK_EVENT_TYPES } from '@/lib/webhooks/deliver';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const [webhook] = await db
      .select({
        id: webhooks.id,
        url: webhooks.url,
        label: webhooks.label,
        events: webhooks.events,
        active: webhooks.active,
        createdAt: webhooks.createdAt,
        updatedAt: webhooks.updatedAt,
      })
      .from(webhooks)
      .where(and(eq(webhooks.id, id), eq(webhooks.userId, user.id)));

    if (!webhook) return notFoundResponse('Webhook');

    return NextResponse.json({ webhook });
  } catch (error) {
    console.error('GET /api/webhooks/[id] error:', error);
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

    const [existing] = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, id), eq(webhooks.userId, user.id)));

    if (!existing) return notFoundResponse('Webhook');

    const body = await parseJsonBody<{
      url?: string;
      label?: string;
      events?: string[];
      active?: boolean;
    }>(request);

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (body.events) {
      const invalidEvents = body.events.filter(
        (e) => !(WEBHOOK_EVENT_TYPES as readonly string[]).includes(e),
      );
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          { error: `Invalid event types: ${invalidEvents.join(', ')}` },
          { status: 400 },
        );
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.url !== undefined) updateData.url = body.url;
    if (body.label !== undefined) updateData.label = body.label;
    if (body.events !== undefined) updateData.events = body.events;
    if (body.active !== undefined) updateData.active = body.active;

    const [updated] = await db
      .update(webhooks)
      .set(updateData)
      .where(eq(webhooks.id, id))
      .returning();

    return NextResponse.json({
      webhook: {
        id: updated.id,
        url: updated.url,
        label: updated.label,
        events: updated.events,
        active: updated.active,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('PUT /api/webhooks/[id] error:', error);
    return serverErrorResponse();
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const [existing] = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, id), eq(webhooks.userId, user.id)));

    if (!existing) return notFoundResponse('Webhook');

    await db.delete(webhooks).where(eq(webhooks.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/webhooks/[id] error:', error);
    return serverErrorResponse();
  }
}
