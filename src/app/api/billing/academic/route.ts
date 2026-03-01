import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db/client';
import { subscriptions, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const emailDomain = user.email.split('@')[1]?.toLowerCase();
  if (!emailDomain?.endsWith('.edu')) {
    return NextResponse.json({ error: 'Academic plan requires a .edu email address' }, { status: 400 });
  }

  // Upsert academic subscription
  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id));

  if (existing.length > 0) {
    await db
      .update(subscriptions)
      .set({ tier: 'academic', status: 'active', updatedAt: new Date() })
      .where(eq(subscriptions.userId, user.id));
  } else {
    await db.insert(subscriptions).values({
      userId: user.id,
      tier: 'academic',
      status: 'active',
    });
  }

  return NextResponse.json({ success: true, tier: 'academic' });
}
