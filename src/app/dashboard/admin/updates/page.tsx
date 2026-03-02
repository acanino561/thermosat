import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db/client';
import { orgMembers, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { APP_VERSION, BUILD_DATE } from '@/lib/version';
import { UpdatesClient } from './updates-client';

export default async function UpdatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login');

  const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
  if (!user) redirect('/dashboard');

  const [membership] = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, user.id), eq(orgMembers.role, 'owner')));

  if (!membership) redirect('/dashboard');

  return (
    <div className="max-w-3xl mx-auto py-10 px-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Updates</h1>
        <p className="text-muted-foreground mt-1">
          Manage your Verixos installation version and database backups.
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Current Version
        </h2>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-accent-blue/10 text-accent-blue px-3 py-1 text-sm font-mono font-semibold">
            v{APP_VERSION}
          </span>
          <span className="text-xs text-muted-foreground">Built: {BUILD_DATE}</span>
        </div>
      </div>

      <UpdatesClient />

      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-muted-foreground">
          <strong>Air-gapped deployments:</strong> If this instance cannot reach the internet, check{' '}
          <a
            href="https://hub.docker.com/r/verixos/app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-blue hover:underline"
          >
            hub.docker.com/r/verixos/app
          </a>{' '}
          for the latest image tags.
        </p>
      </div>
    </div>
  );
}
