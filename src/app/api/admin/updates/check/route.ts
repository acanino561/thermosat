import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db/client';
import { orgMembers, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requiresLicense } from '@/lib/license/validate';
import { APP_VERSION } from '@/lib/version';

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, user.id), eq(orgMembers.role, 'owner')));

  if (!membership) {
    return NextResponse.json({ error: 'Only organization owners can check for updates' }, { status: 403 });
  }

  if (!requiresLicense()) {
    return NextResponse.json({ selfHosted: false });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch('https://updates.verixos.com/api/v1/latest', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const latestVersion = data.version as string;
    const available = compareSemver(latestVersion, APP_VERSION) > 0;

    return NextResponse.json({
      available,
      currentVersion: APP_VERSION,
      latestVersion,
      releaseDate: data.releaseDate ?? null,
      changelog: data.changelog ?? null,
      imageTag: data.imageTag ?? null,
      updateCommand: available ? 'docker compose pull && docker compose up -d' : undefined,
    });
  } catch {
    return NextResponse.json({
      available: false,
      currentVersion: APP_VERSION,
      error: 'Update check failed — check hub.docker.com/r/verixos/app manually',
    });
  }
}
