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

  const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwNdR/c8QHoosixZ0WNAk
V2FsnkaF/RHlMKoXmCFWGmrZwBmzXLlNkhIiM8WyEa2VuGJD2iKBkjenR/m/+Cv9
zcCw/pZn5Ny4cpQ6Fj5EY29WGo52smAHbeCsjSt2QVu4SunETlQNcgUcTMIj7D3H
iDBHK6isureJf55MTq9oYTc9CDjxo7/di5C0r1uVF9xzPvwqoLDs0YtzisTxAbKi
U+z0S3FzL7G8+UmMyjhZHSiUXLyesR1AMTDD6HJsv9v6GKTLl+kpkOpUatCsZTGK
3ZYVoyZljlg0S7Yn3sqjJQ4fbuNlEgxFCzsqTdM+5TAHCR9f5jxD7v0Q8hbNoaKn
lQIDAQAB
-----END PUBLIC KEY-----`;

  try {
    const key = await importSPKI(LICENSE_PUBLIC_KEY, 'RS256');
    const { payload } = await jwtVerify(process.env.VERIXOS_LICENSE_KEY, key, {
      issuer: 'verixos-licensing',
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
