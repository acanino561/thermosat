import { NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/api-key';
import { rateLimiter } from '@/lib/auth/rate-limit';

export async function authenticateApiKey(
  request: Request,
): Promise<
  | { userId: string; orgId: string | null }
  | NextResponse
> {
  const auth = await validateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keyHeader = request.headers.get('X-API-Key') ?? '';
  if (!rateLimiter.check(keyHeader)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  return auth;
}

export function isErrorResponse(
  result: { userId: string; orgId: string | null } | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
