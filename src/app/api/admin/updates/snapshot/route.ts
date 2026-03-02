import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db/client';
import { orgMembers, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requiresLicense } from '@/lib/license/validate';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function POST(_req: NextRequest) {
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
    return NextResponse.json({ error: 'Only organization owners can take snapshots' }, { status: 403 });
  }

  if (!requiresLicense()) {
    return NextResponse.json({ error: 'Only available in self-hosted mode' }, { status: 400 });
  }

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = `/tmp/verixos-backup-${timestamp}.sql`;
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    await execFileAsync('pg_dump', ['--dbname', dbUrl, '-f', outPath], { timeout: 60000 });

    return NextResponse.json({ success: true, snapshotPath: outPath, timestamp });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Snapshot failed',
    });
  }
}
