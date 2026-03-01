import { SAML } from '@node-saml/node-saml';
import type { ssoConfigs } from '@/lib/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export type SsoConfig = InferSelectModel<typeof ssoConfigs>;

const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

export function getSamlInstance(ssoConfig: SsoConfig, orgSlug: string): SAML {
  return new SAML({
    callbackUrl: `${BASE_URL}/api/saml/${orgSlug}/acs`,
    issuer: `${BASE_URL}/api/saml/${orgSlug}/metadata`,
    entryPoint: ssoConfig.ssoUrl,
    idpCert: ssoConfig.certificate,
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: true,
    requestIdExpirationPeriodMs: 600000, // 10 minutes
  });
}

export async function parseSamlResponse(
  ssoConfig: SsoConfig,
  orgSlug: string,
  body: { SAMLResponse: string },
): Promise<{ nameID: string; email: string; attributes: Record<string, unknown> }> {
  const saml = getSamlInstance(ssoConfig, orgSlug);
  const { profile } = await saml.validatePostResponseAsync(body);

  if (!profile) {
    throw new Error('SAML response did not contain a valid profile');
  }

  const nameID = profile.nameID ?? '';
  const email =
    (profile.email as string) ??
    (profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] as string) ??
    nameID;

  // Collect all attributes except known fields
  const knownKeys = new Set(['issuer', 'nameID', 'nameIDFormat', 'nameQualifier', 'spNameQualifier', 'sessionIndex', 'email']);
  const attributes: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(profile)) {
    if (!knownKeys.has(k)) {
      attributes[k] = v;
    }
  }

  return { nameID, email, attributes };
}

export function generateSPMetadata(orgSlug: string): string {
  const entityId = `${BASE_URL}/api/saml/${orgSlug}/metadata`;
  const acsUrl = `${BASE_URL}/api/saml/${orgSlug}/acs`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${entityId}">
  <md:SPSSODescriptor
    AuthnRequestsSigned="false"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acsUrl}"
      index="0"
      isDefault="true" />
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
}

export async function parseIdPMetadata(
  metadataXml: string,
): Promise<{ entityId: string; ssoUrl: string; certificate: string }> {
  // Simple regex-based parsing of standard SAML metadata
  const entityIdMatch = metadataXml.match(/entityID="([^"]+)"/);
  const ssoUrlMatch = metadataXml.match(
    /SingleSignOnService[^>]*Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"[^>]*Location="([^"]+)"/,
  ) ?? metadataXml.match(
    /SingleSignOnService[^>]*Location="([^"]+)"/,
  );
  const certMatch = metadataXml.match(
    /<(?:ds:)?X509Certificate[^>]*>([\s\S]*?)<\/(?:ds:)?X509Certificate>/,
  );

  if (!entityIdMatch) throw new Error('Could not find entityID in metadata');
  if (!ssoUrlMatch) throw new Error('Could not find SingleSignOnService URL in metadata');
  if (!certMatch) throw new Error('Could not find X509Certificate in metadata');

  return {
    entityId: entityIdMatch[1],
    ssoUrl: ssoUrlMatch[1],
    certificate: certMatch[1].replace(/\s/g, ''),
  };
}
