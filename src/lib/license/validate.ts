import { jwtVerify, importSPKI } from 'jose';

// RSA public key for license verification (RS256)
// Private key is kept secret by Verixos licensing authority — never committed to code
const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwNdR/c8QHoosixZ0WNAk
V2FsnkaF/RHlMKoXmCFWGmrZwBmzXLlNkhIiM8WyEa2VuGJD2iKBkjenR/m/+Cv9
zcCw/pZn5Ny4cpQ6Fj5EY29WGo52smAHbeCsjSt2QVu4SunETlQNcgUcTMIj7D3H
iDBHK6isureJf55MTq9oYTc9CDjxo7/di5C0r1uVF9xzPvwqoLDs0YtzisTxAbKi
U+z0S3FzL7G8+UmMyjhZHSiUXLyesR1AMTDD6HJsv9v6GKTLl+kpkOpUatCsZTGK
3ZYVoyZljlg0S7Yn3sqjJQ4fbuNlEgxFCzsqTdM+5TAHCR9f5jxD7v0Q8hbNoaKn
lQIDAQAB
-----END PUBLIC KEY-----`;

export interface LicensePayload {
  org: string;
  seats: number;
  tier: 'starter' | 'pro' | 'team' | 'enterprise';
  exp: number;
  iat: number;
  iss: string;
}

export interface LicenseStatus {
  valid: boolean;
  org?: string;
  seats?: number;
  tier?: string;
  expiresAt?: Date;
  daysUntilExpiry?: number;
  error?: string;
}

let cachedKey: CryptoKey | null = null;

async function getPublicKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    cachedKey = await importSPKI(LICENSE_PUBLIC_KEY, 'RS256');
  }
  return cachedKey;
}

export async function validateLicense(licenseKey: string): Promise<LicenseStatus> {
  try {
    const key = await getPublicKey();
    const { payload } = await jwtVerify(licenseKey, key, {
      issuer: 'verixos-licensing',
    });

    const { org, seats, tier, exp } = payload as unknown as LicensePayload;

    if (!org || !seats || !tier || !exp) {
      return { valid: false, error: 'Malformed license: missing required fields' };
    }

    const expiresAt = new Date(exp * 1000);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return {
        valid: false,
        org,
        seats,
        tier,
        expiresAt,
        daysUntilExpiry,
        error: 'License has expired',
      };
    }

    return { valid: true, org, seats, tier, expiresAt, daysUntilExpiry };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { valid: false, error: `License validation failed: ${message}` };
  }
}

export async function getLicenseStatus(): Promise<LicenseStatus> {
  const key = process.env.VERIXOS_LICENSE_KEY;
  if (!key) {
    return { valid: false, error: 'No license key configured' };
  }
  return validateLicense(key);
}

export async function isLicensed(): Promise<boolean> {
  if (!requiresLicense()) return true; // cloud SaaS — no license needed
  const status = await getLicenseStatus();
  return status.valid;
}

/** Returns true if VERIXOS_LICENSE_KEY is set in env (on-premise mode) */
export function requiresLicense(): boolean {
  return !!process.env.VERIXOS_LICENSE_KEY;
}
