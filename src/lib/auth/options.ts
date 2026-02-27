import type { NextAuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { Adapter } from 'next-auth/adapters';
import { checkRateLimit, recordFailedAttempt } from './rate-limit';

let _authOptions: NextAuthOptions | null = null;

export function getAuthOptions(): NextAuthOptions {
  if (!_authOptions) {
    _authOptions = {
      adapter: DrizzleAdapter(db) as Adapter,
      providers: [
        GithubProvider({
          clientId: process.env.GITHUB_CLIENT_ID ?? '',
          clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
        }),
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID ?? '',
          clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        }),
        CredentialsProvider({
          name: 'credentials',
          credentials: {
            email: { label: 'Email', type: 'email' },
            password: { label: 'Password', type: 'password' },
          },
          async authorize(credentials, req) {
            if (!credentials?.email || !credentials?.password) return null;

            // Rate limiting — extract IP from headers
            const forwarded = req?.headers?.['x-forwarded-for'];
            const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded?.[0]) ?? 'unknown';
            const rateCheck = checkRateLimit(ip);
            if (!rateCheck.allowed) {
              throw new Error('Too many login attempts. Please try again later.');
            }

            const [user] = await db
              .select()
              .from(users)
              .where(and(eq(users.email, credentials.email), isNull(users.deletedAt)));

            if (!user || !user.password) {
              recordFailedAttempt(ip);
              return null;
            }

            const valid = await bcrypt.compare(credentials.password, user.password);
            if (!valid) {
              recordFailedAttempt(ip);
              return null;
            }

            if (!user.emailVerified) {
              throw new Error('Please verify your email before signing in.');
            }

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
            };
          },
        }),
      ],
      session: {
        strategy: 'jwt',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        updateAge: 24 * 60 * 60, // refresh token on activity every 24h
      },
      callbacks: {
        session({ session, token }) {
          if (session.user && token.sub) {
            (session.user as { id: string }).id = token.sub;
          }
          return session;
        },
        jwt({ token, user }) {
          if (user) {
            token.sub = user.id;
          }
          return token;
        },
      },
      pages: {
        signIn: '/login',
        error: '/login',
      },
      secret: process.env.NEXTAUTH_SECRET,
    };
  }
  return _authOptions;
}

// Backward compat — lazy proxy so imports of `authOptions` still work
export const authOptions = new Proxy({} as NextAuthOptions, {
  get(_, prop) {
    if (!process.env.DATABASE_URL) return undefined;
    return (getAuthOptions() as any)[prop];
  },
});
