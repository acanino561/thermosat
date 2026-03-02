/**
 * Generate a test license key for development.
 * Usage: npx ts-node scripts/generate-test-license.ts
 *
 * Requires the private key at /data/workspace/.secrets/verixos-license-private-key.pem
 */

import { SignJWT, importPKCS8 } from 'jose';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
  const privateKeyPath = resolve(__dirname, '../../.secrets/verixos-license-private-key.pem');
  let privateKeyPem: string;

  try {
    privateKeyPem = readFileSync(privateKeyPath, 'utf-8');
  } catch {
    // Fallback for running from workspace root
    const altPath = resolve(process.cwd(), '../.secrets/verixos-license-private-key.pem');
    privateKeyPem = readFileSync(altPath, 'utf-8');
  }

  const privateKey = await importPKCS8(privateKeyPem, 'RS256');

  const now = Math.floor(Date.now() / 1000);
  const thirtyDays = 30 * 24 * 60 * 60;

  const jwt = await new SignJWT({
    org: 'Verixos Development',
    seats: 5,
    tier: 'enterprise',
    customerId: 'test-customer-001',
    features: ['thermal-solver', 'orbital-sim', 'reports'],
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer('verixos:licensing')
    .setIssuedAt(now)
    .setExpirationTime(now + thirtyDays)
    .sign(privateKey);

  console.log('Generated 30-day trial license:\n');
  console.log(jwt);
  console.log('\nSet in your environment:');
  console.log(`VERIXOS_LICENSE_KEY=${jwt}`);
}

main().catch(console.error);
