import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { db } from '@/lib/db/client';
import { users, accounts, projects, thermalModels, simulationRuns } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/** GDPR data export — returns all personal data as JSON. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.email, session.user.email));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, user.id));
    const userProjects = await db.select().from(projects).where(eq(projects.userId, user.id));

    const projectIds = userProjects.map((p) => p.id);
    let models: unknown[] = [];
    let simulations: unknown[] = [];

    if (projectIds.length > 0) {
      // Fetch models for each project
      for (const pid of projectIds) {
        const m = await db.select().from(thermalModels).where(eq(thermalModels.projectId, pid));
        models.push(...m);
        for (const model of m) {
          const s = await db.select().from(simulationRuns).where(eq(simulationRuns.modelId, model.id));
          simulations.push(...s);
        }
      }
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organization: user.organization,
        roleTitle: user.roleTitle,
        unitsPref: user.unitsPref,
        tempUnit: user.tempUnit,
        createdAt: user.createdAt,
      },
      connectedAccounts: userAccounts.map((a) => ({
        provider: a.provider,
        type: a.type,
      })),
      projects: userProjects,
      thermalModels: models,
      simulationRuns: simulations,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="thermosat-export-${user.id}.json"`,
      },
    });
  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
