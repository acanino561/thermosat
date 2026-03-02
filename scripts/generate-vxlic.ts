#!/usr/bin/env ts-node
/**
 * Generate a .vxlic license file for Verixos on-premise deployments.
 *
 * Usage:
 *   npx ts-node scripts/generate-vxlic.ts --org "Acme" --seats 10 --days 365 --tier enterprise
 *
 * Outputs: license.vxlic in current directory
 *
 * Requires the private key at /data/workspace/.secrets/verixos-license-private-key.pem
 */

import * as jose from 'jose';
import { readFileSync, writeFileSync } from 'fs';

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string, defaultValue?: string): string => {
    const idx = args.indexOf(`--${name}`);
    if (idx === -1 || idx + 1 >= args.length) {
      if (defaultValue !== undefined) return defaultValue;
      console.error(`Missing required argument: --${name}`);
      process.exit(1);
    }
    return args[idx + 1];
  };

  const org = getArg('org');
  const seats = parseInt(getArg('seats', '10'), 10);
  const days = parseInt(getArg('days', '365'), 10);
  const tier = getArg('tier', 'enterprise') as 'starter' | 'pro' | 'team' | 'enterprise';

  const validTiers = ['starter', 'pro', 'team', 'enterprise'];
  if (!validTiers.includes(tier)) {
    console.error(`Invalid tier: ${tier}. Must be one of: ${validTiers.join(', ')}`);
    process.exit(1);
  }

  const privateKeyPath = '/data/workspace/.secrets/verixos-license-private-key.pem';
  let privateKeyPem: string;
  try {
    privateKeyPem = readFileSync(privateKeyPath, 'utf-8');
  } catch {
    console.error(`Cannot read private key at ${privateKeyPath}`);
    process.exit(1);
  }

  const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256');

  const now = Math.floor(Date.now() / 1000);
  const exp = now + days * 24 * 60 * 60;

  const jwt = await new jose.SignJWT({
    org,
    seats,
    tier,
    customerId: `org:${org.toLowerCase().replace(/\s+/g, '-')}`,
    features: ['thermal-solver', 'orbital-sim', 'reports'],
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setIssuer('verixos:licensing')
    .setSubject(`org:${org.toLowerCase().replace(/\s+/g, '-')}`)
    .sign(privateKey);

  const filename = 'license.vxlic';
  writeFileSync(filename, jwt + '\n', 'utf-8');

  console.log(`✅ License file generated: ${filename}`);
  console.log(`   Organization: ${org}`);
  console.log(`   Tier: ${tier}`);
  console.log(`   Seats: ${seats}`);
  console.log(`   Valid for: ${days} days`);
  console.log(`   Expires: ${new Date(exp * 1000).toISOString()}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
