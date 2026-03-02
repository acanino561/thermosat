import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only enforce license on dashboard routes
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  // Cloud SaaS mode — no license enforcement
  if (!process.env.VERIXOS_LICENSE_KEY) {
    return NextResponse.next();
  }

  // Dynamic import to avoid bundling issues in edge runtime
  // We do a lightweight JWT check here using jose (edge-compatible)
  const { jwtVerify, importSPKI } = await import('jose');

  const licensePublicKeyPem = process.env.LICENSE_PUBLIC_KEY;
  if (!licensePublicKeyPem) {
    throw new Error('LICENSE_PUBLIC_KEY environment variable is not set');
  }

  try {
    const key = await importSPKI(licensePublicKeyPem, 'RS256');
    const { payload } = await jwtVerify(process.env.VERIXOS_LICENSE_KEY, key, {
      issuer: 'verixos:licensing',
    });

    const exp = payload.exp as number;
    const now = Math.floor(Date.now() / 1000);
    const daysUntilExpiry = Math.floor((exp - now) / 86400);

    if (daysUntilExpiry < 0) {
      // License expired — redirect
      return NextResponse.redirect(new URL('/license-error', request.url));
    }

    const response = NextResponse.next();

    if (daysUntilExpiry <= 7) {
      response.headers.set('X-License-Warning', 'true');
      response.headers.set('X-License-Days-Remaining', String(daysUntilExpiry));
    }

    return response;
  } catch {
    // Invalid license — redirect to error page
    return NextResponse.redirect(new URL('/license-error', request.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
