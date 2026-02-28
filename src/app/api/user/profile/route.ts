import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db/client';
import { users, projects } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import { z } from 'zod';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      organization: users.organization,
      roleTitle: users.roleTitle,
      unitsPref: users.unitsPref,
      tempUnit: users.tempUnit,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.email, session.user.email));

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [{ projectCount }] = await db
    .select({ projectCount: count() })
    .from(projects)
    .where(eq(projects.userId, user.id));

  return NextResponse.json({ ...user, projectCount });
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  organization: z.string().max(100).optional(),
  roleTitle: z.string().max(100).optional(),
  unitsPref: z.enum(['si', 'imperial']).optional(),
  tempUnit: z.enum(['K', 'C', 'F']).optional(),
});

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    await db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(users.email, session.user.email));

    return NextResponse.json({ message: 'Profile updated' });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
