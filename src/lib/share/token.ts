import crypto from 'crypto';

export function generateShareToken(): string {
  return crypto.randomBytes(16).toString('hex');
}
