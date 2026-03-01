import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { webhooks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  serverErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api-helpers';
import { hashSecret } from '@/lib/webhooks/deliver';
import { WEBHOOK_EVENT_TYPES } from '@/lib/webhooks/deliver';

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const rows = await db
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
      .where(eq(webhooks.userId, user.id));

    return NextResponse.json({ webhooks: rows });
  } catch (error) {
    console.error('GET /api/webhooks error:', error);
    return serverErrorResponse();
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const body = await parseJsonBody<{
      url: string;
      label: string;
      events: string[];
      secret: string;
    }>(request);

    if (!body || !body.url || !body.label || !body.secret || !Array.isArray(body.events)) {
      return NextResponse.json(
        { error: 'Missing required fields: url, label, events, secret' },
        { status: 400 },
      );
    }

    // Validate event types
    const invalidEvents = body.events.filter(
      (e) => !(WEBHOOK_EVENT_TYPES as readonly string[]).includes(e),
    );
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid event types: ${invalidEvents.join(', ')}` },
        { status: 400 },
      );
    }

    const secretH = hashSecret(body.secret);

    const [webhook] = await db
      .insert(webhooks)
      .values({
        userId: user.id,
        url: body.url,
        label: body.label,
        events: body.events,
        secretHash: secretH,
      })
      .returning();

    return NextResponse.json({
      webhook: {
        id: webhook.id,
        url: webhook.url,
        label: webhook.label,
        events: webhook.events,
        active: webhook.active,
        createdAt: webhook.createdAt,
      },
      secret: body.secret, // Return ONCE
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/webhooks error:', error);
    return serverErrorResponse();
  }
}
