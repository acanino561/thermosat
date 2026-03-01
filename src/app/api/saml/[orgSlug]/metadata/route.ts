import { NextResponse } from 'next/server';
import { generateSPMetadata } from '@/lib/auth/saml';

interface RouteParams {
  params: Promise<{ orgSlug: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { orgSlug } = await params;
  const xml = generateSPMetadata(orgSlug);
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
