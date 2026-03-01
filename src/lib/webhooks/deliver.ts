import { createHmac, createHash } from 'crypto';
import { db } from '@/lib/db/client';
import { webhooks, webhookDeliveries } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const RETRY_DELAYS = [5_000, 30_000, 300_000]; // 5s, 30s, 300s
const MAX_ATTEMPTS = 3;

export const WEBHOOK_EVENT_TYPES = [
  'simulation.completed',
  'simulation.failed',
  'model.updated',
  'review.status_changed',
  'member.joined',
  'failure_analysis.completed',
  'design_exploration.completed',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

function signPayload(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

async function attemptDelivery(
  url: string,
  secretHash: string,
  payload: string,
): Promise<{ status: number; body: string }> {
  const signature = signPayload(secretHash, payload);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Verixos-Signature': `sha256=${signature}`,
      },
      body: payload,
      signal: controller.signal,
    });

    const body = await response.text().catch(() => '');
    return {
      status: response.status,
      body: body.slice(0, 500),
    };
  } catch (err) {
    return {
      status: 0,
      body: err instanceof Error ? err.message.slice(0, 500) : 'Unknown error',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function deliverToWebhook(
  webhookId: string,
  secretHash: string,
  url: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const payloadStr = JSON.stringify(payload);

  // Create delivery record
  const [delivery] = await db
    .insert(webhookDeliveries)
    .values({
      webhookId,
      eventType,
      payload,
      status: 'pending',
      attempts: 0,
    })
    .returning();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt - 1]));
    }

    const result = await attemptDelivery(url, secretHash, payloadStr);
    const now = new Date();

    if (result.status >= 200 && result.status < 300) {
      await db
        .update(webhookDeliveries)
        .set({
          status: 'success',
          attempts: attempt + 1,
          lastAttemptAt: now,
          httpStatus: result.status,
          responseBody: result.body,
        })
        .where(eq(webhookDeliveries.id, delivery.id));
      return;
    }

    // Update attempt info
    const isLastAttempt = attempt === MAX_ATTEMPTS - 1;
    await db
      .update(webhookDeliveries)
      .set({
        status: isLastAttempt ? 'failed' : 'pending',
        attempts: attempt + 1,
        lastAttemptAt: now,
        httpStatus: result.status || null,
        responseBody: result.body,
      })
      .where(eq(webhookDeliveries.id, delivery.id));
  }
}

export async function deliverWebhookEvent(
  userId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  // Find all active webhooks for this user subscribed to this event
  const userWebhooks = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.userId, userId), eq(webhooks.active, true)));

  const matching = userWebhooks.filter((wh) => {
    const events = wh.events as string[];
    return events.includes(eventType);
  });

  // Fire and forget each delivery (run in background)
  for (const wh of matching) {
    deliverToWebhook(wh.id, wh.secretHash, wh.url, eventType, payload).catch(
      (err) => console.error(`Webhook delivery error for ${wh.id}:`, err),
    );
  }
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}
