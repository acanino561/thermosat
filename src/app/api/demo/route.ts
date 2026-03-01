import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { projects, thermalModels, simulationRuns } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    const [demoProject] = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
      })
      .from(projects)
      .where(eq(projects.isDemo, true))
      .limit(1);

    if (!demoProject) {
      return NextResponse.json({ demo: null });
    }

    // Find the model and completed run
    const [model] = await db
      .select({ id: thermalModels.id })
      .from(thermalModels)
      .where(eq(thermalModels.projectId, demoProject.id))
      .limit(1);

    const [run] = model
      ? await db
          .select({ id: simulationRuns.id })
          .from(simulationRuns)
          .where(
            and(
              eq(simulationRuns.modelId, model.id),
              eq(simulationRuns.status, 'completed'),
            ),
          )
          .limit(1)
      : [undefined];

    return NextResponse.json({
      demo: {
        projectId: demoProject.id,
        modelId: model?.id ?? null,
        runId: run?.id ?? null,
        name: demoProject.name,
        description: demoProject.description,
      },
    });
  } catch {
    return NextResponse.json({ demo: null });
  }
}
