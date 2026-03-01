import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { webhooks, webhookDeliveries } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createHmac } from 'crypto';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/utils/api-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, id), eq(webhooks.userId, user.id)));

    if (!webhook) return notFoundResponse('Webhook');

    const testPayload = {
      event: 'test',
      webhook_id: webhook.id,
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook delivery from Verixos.',
    };

    const payloadStr = JSON.stringify(testPayload);
    const signature = createHmac('sha256', webhook.secretHash)
      .update(payloadStr)
      .digest('hex');

    // Create delivery record
    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        webhookId: webhook.id,
        eventType: 'test',
        payload: testPayload,
        status: 'pending',
        attempts: 0,
      })
      .returning();

    // Attempt delivery immediately
    let status = 0;
    let body = '';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Verixos-Signature': `sha256=${signature}`,
        },
        body: payloadStr,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      status = response.status;
      body = (await response.text().catch(() => '')).slice(0, 500);
    } catch (err) {
      body = err instanceof Error ? err.message.slice(0, 500) : 'Unknown error';
    }

    const success = status >= 200 && status < 300;
    await db
      .update(webhookDeliveries)
      .set({
        status: success ? 'success' : 'failed',
        attempts: 1,
        lastAttemptAt: new Date(),
        httpStatus: status || null,
        responseBody: body,
      })
      .where(eq(webhookDeliveries.id, delivery.id));

    return NextResponse.json({
      delivery: {
        id: delivery.id,
        status: success ? 'success' : 'failed',
        httpStatus: status || null,
        responseBody: body,
      },
    });
  } catch (error) {
    console.error('POST /api/webhooks/[id]/test error:', error);
    return serverErrorResponse();
  }
}
