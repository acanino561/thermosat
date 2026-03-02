import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db/client';
import { orgMembers, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { validateLicenseKey, setRuntimeLicenseKey } from '@/lib/license/validate';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is org owner
  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, user.id), eq(orgMembers.role, 'owner')));

  if (!membership) {
    return NextResponse.json({ error: 'Only organization owners can upload licenses' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.vxlic')) {
      return NextResponse.json({ error: 'File must have .vxlic extension' }, { status: 400 });
    }

    const licenseKey = (await file.text()).trim();
    if (!licenseKey) {
      return NextResponse.json({ error: 'License file is empty' }, { status: 400 });
    }

    const status = await validateLicenseKey(licenseKey);

    if (!status.valid) {
      return NextResponse.json(
        { error: status.error || 'Invalid license key', valid: false },
        { status: 400 },
      );
    }

    // Store in runtime memory (persists until process restart)
    setRuntimeLicenseKey(licenseKey);

    return NextResponse.json({
      valid: true,
      org: status.org,
      seats: status.seats,
      tier: status.tier,
      expiresAt: status.expiresAt?.toISOString(),
      daysRemaining: status.daysRemaining,
      message: 'License uploaded successfully. For persistence across restarts, set VERIXOS_LICENSE_KEY in your .env file.',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to process license file' }, { status: 500 });
  }
}
