import * as jose from 'jose';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// RSA public key for license verification (matches the private key used to sign .vxlic files)
const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWe
HKbJSMzEwOIFnZJkGp3S1KBmATMkGsKMnuR2Iv9FLHGQsaN/4E0aMkhVU1yPaQp
NKSkvBLiJYBBShFGjmOAJMFjKNzQTEmiTZbJz3LkXx2JyEHbMDkMK0TF4tUdNOxR
eLRGnfJMUCG07cPmBkjOX+MH1WhN+sBgTMyOr20uRUiNYiL8SDpCAlhaJp7jkr5m
HAeKQjOKFr0i/oqnWqJxz2CAYJ79MH4JRQW6TeGBXHLCDP4FHmBqxOOvh0GYfT/A
QKaGUVRsBzNCm9PNXJV0GrjRYPqGhNbjkMVYlHC0+MCGfKBWqMiZLDHxjfjyDOCF
2wIDAQAB
-----END PUBLIC KEY-----`;

export interface LicensePayload {
  org: string;
  seats: number;
  tier: 'starter' | 'pro' | 'team' | 'enterprise';
  exp: number;
  iat: number;
  iss: string;
  sub: string;
}

export interface LicenseStatus {
  valid: boolean;
  org?: string;
  seats?: number;
  tier?: string;
  expiresAt?: Date;
  daysRemaining?: number;
  /** @deprecated Use daysRemaining */
  daysUntilExpiry?: number;
  expired?: boolean;
  error?: string;
  source?: 'env' | 'system-file' | 'local-file' | 'runtime';
}

/**
 * Check if this deployment requires a license (on-premise mode).
 * Returns true when VERIXOS_SELF_HOSTED is set or a license key/file is present.
 */
export function requiresLicense(): boolean {
  if (process.env.VERIXOS_SELF_HOSTED === 'true') return true;
  if (process.env.VERIXOS_LICENSE_KEY) return true;
  // Check file existence without reading
  const { existsSync } = require('fs');
  const isWindows = process.platform === 'win32';
  const systemPath = isWindows
    ? 'C:\\ProgramData\\Verixos\\license.vxlic'
    : '/etc/verixos/license.vxlic';
  if (existsSync(systemPath)) return true;
  const { join } = require('path');
  if (existsSync(join(process.cwd(), 'license.vxlic'))) return true;
  return false;
}

// In-memory runtime license store (set via admin upload endpoint)
let runtimeLicenseKey: string | null = null;

export function setRuntimeLicenseKey(key: string | null) {
  runtimeLicenseKey = key;
}

export function getRuntimeLicenseKey(): string | null {
  return runtimeLicenseKey;
}

/**
 * Resolve the license JWT from multiple sources in priority order:
 * 1. Runtime override (set via admin upload)
 * 2. VERIXOS_LICENSE_KEY env var
 * 3. System-level .vxlic file (/etc/verixos/license.vxlic on Linux, C:\ProgramData\Verixos\license.vxlic on Windows)
 * 4. Local .vxlic file (./license.vxlic in current working directory)
 */
function resolveLicenseKey(): { key: string; source: LicenseStatus['source'] } | null {
  // 1. Runtime override
  if (runtimeLicenseKey) {
    return { key: runtimeLicenseKey.trim(), source: 'runtime' };
  }

  // 2. Environment variable
  const envKey = process.env.VERIXOS_LICENSE_KEY;
  if (envKey) {
    return { key: envKey.trim(), source: 'env' };
  }

  // 3. System-level file
  const isWindows = process.platform === 'win32';
  const systemPath = isWindows
    ? join('C:', 'ProgramData', 'Verixos', 'license.vxlic')
    : '/etc/verixos/license.vxlic';

  if (existsSync(systemPath)) {
    try {
      const content = readFileSync(systemPath, 'utf-8').trim();
      if (content) return { key: content, source: 'system-file' };
    } catch {
      // Permission denied or read error — fall through
    }
  }

  // 4. Local file (current working directory)
  const localPath = join(process.cwd(), 'license.vxlic');
  if (existsSync(localPath)) {
    try {
      const content = readFileSync(localPath, 'utf-8').trim();
      if (content) return { key: content, source: 'local-file' };
    } catch {
      // Fall through
    }
  }

  return null;
}

/**
 * Validate a specific license key JWT and return the decoded payload.
 * Purely local — no network calls. Uses RSA signature verification.
 */
export async function validateLicenseKey(jwt: string): Promise<LicenseStatus> {
  try {
    const publicKey = await jose.importSPKI(LICENSE_PUBLIC_KEY, 'RS256');
    const { payload } = await jose.jwtVerify(jwt, publicKey, {
      issuer: 'aurora:licensing',
    });

    const licensePayload = payload as unknown as LicensePayload;
    const expiresAt = new Date(licensePayload.exp * 1000);
    const now = new Date();
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const expired = daysRemaining <= 0;

    const days = Math.max(0, daysRemaining);
    return {
      valid: !expired,
      org: licensePayload.org,
      seats: licensePayload.seats,
      tier: licensePayload.tier,
      expiresAt,
      daysRemaining: days,
      daysUntilExpiry: days,
      expired,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Invalid license key',
    };
  }
}

/**
 * Get current license status by checking all sources in priority order.
 * No internet required — validation is purely local (RSA signature verification).
 */
export async function getLicenseStatus(): Promise<LicenseStatus> {
  const resolved = resolveLicenseKey();
  if (!resolved) {
    return {
      valid: false,
      error: 'No license key found. Set VERIXOS_LICENSE_KEY or provide a .vxlic file.',
    };
  }

  const status = await validateLicenseKey(resolved.key);
  status.source = resolved.source;
  return status;
}
