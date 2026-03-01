import crypto from 'crypto';
import { db } from '@/lib/db/client';
import { apiKeys } from '@/lib/db/schema';
import { eq, and, isNull, or, gt } from 'drizzle-orm';

const KEY_PREFIX = 'vx_live_';
const KEY_PATTERN = /^vx_live_[0-9a-f]{32}$/;

export function generateApiKey(): { plaintext: string; hash: string; hint: string } {
  const random = crypto.randomBytes(16).toString('hex');
  const plaintext = `${KEY_PREFIX}${random}`;
  const hash = crypto.createHash('sha256').update(plaintext).digest('hex');
  const hint = plaintext.slice(-4);
  return { plaintext, hash, hint };
}

export async function validateApiKey(
  request: Request,
): Promise<{ userId: string; orgId: string | null } | null> {
  const key = request.headers.get('X-API-Key');
  if (!key || !KEY_PATTERN.test(key)) return null;

  const hash = crypto.createHash('sha256').update(key).digest('hex');

  const [row] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash));

  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;

  // Fire-and-forget: update last_used_at
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .then(() => {})
    .catch(() => {});

  return { userId: row.userId, orgId: row.orgId };
}
