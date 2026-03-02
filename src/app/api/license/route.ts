import { NextResponse } from 'next/server';
import { getLicenseStatus, requiresLicense } from '@/lib/license/validate';
import { getActiveSeatCount } from '@/lib/license/seats';

export async function GET() {
  if (!requiresLicense()) {
    return NextResponse.json({ licensed: true, mode: 'cloud' });
  }

  const status = await getLicenseStatus();

  return NextResponse.json({
    licensed: status.valid,
    org: status.org,
    seats: status.seats,
    activeSeats: getActiveSeatCount(),
    tier: status.tier,
    expiresAt: status.expiresAt?.toISOString(),
    daysUntilExpiry: status.daysUntilExpiry,
    error: status.error,
  });
}
