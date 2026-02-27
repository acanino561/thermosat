import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db/client';
import { accounts, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

/** GET connected providers for the current user. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [user] = await db
    .select({ id: users.id, password: users.password })
    .from(users)
    .where(eq(users.email, session.user.email));

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const linked = await db
    .select({ provider: accounts.provider, providerAccountId: accounts.providerAccountId })
    .from(accounts)
    .where(eq(accounts.userId, user.id));

  return NextResponse.json({
    providers: linked,
    hasPassword: !!user.password,
  });
}

/** DELETE — unlink an OAuth provider. */
const unlinkSchema = z.object({
  provider: z.string().min(1),
});

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = unlinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const [user] = await db
      .select({ id: users.id, password: users.password })
      .from(users)
      .where(eq(users.email, session.user.email));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure user has another auth method (password or other provider)
    const linked = await db
      .select({ provider: accounts.provider })
      .from(accounts)
      .where(eq(accounts.userId, user.id));

    const otherProviders = linked.filter((l) => l.provider !== parsed.data.provider);
    if (otherProviders.length === 0 && !user.password) {
      return NextResponse.json(
        { error: 'Cannot unlink your only sign-in method. Add a password first.' },
        { status: 400 },
      );
    }

    await db
      .delete(accounts)
      .where(
        and(
          eq(accounts.userId, user.id),
          eq(accounts.provider, parsed.data.provider),
        ),
      );

    return NextResponse.json({ message: `${parsed.data.provider} unlinked` });
  } catch (error) {
    console.error('Unlink provider error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
