import type { NextAuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db/client';
import type { Adapter } from 'next-auth/adapters';

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
      ],
      session: {
        strategy: 'jwt',
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
        signIn: '/auth/signin',
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
