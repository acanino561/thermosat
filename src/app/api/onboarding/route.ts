import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { projects, thermalModels, thermalNodes, conductors } from '@/lib/db/schema';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  serverErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api-helpers';
import { getTemplate } from '@/lib/templates';

const onboardingSchema = z.object({
  projectName: z.string().min(1).max(200),
  projectDescription: z.string().max(1000).optional(),
  templateId: z.string().min(1),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const { projectName, projectDescription, templateId } = parsed.data;
    const template = getTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Invalid template' }, { status: 400 });
    }

    // Create project
    const [project] = await db
      .insert(projects)
      .values({
        userId: user.id,
        name: projectName,
        description: projectDescription ?? '',
      })
      .returning();

    // Create model
    const [model] = await db
      .insert(thermalModels)
      .values({
        projectId: project.id,
        name: template.name,
        description: template.description,
      })
      .returning();

    // Create nodes
    if (template.nodes.length > 0) {
      const createdNodes = await db
        .insert(thermalNodes)
        .values(
          template.nodes.map((n) => ({
            modelId: model.id,
            name: n.name,
            nodeType: n.nodeType,
            temperature: n.temperature,
            capacitance: n.capacitance ?? null,
            boundaryTemp: n.boundaryTemp ?? null,
            area: n.area ?? null,
            mass: n.mass ?? null,
            absorptivity: n.absorptivity ?? null,
            emissivity: n.emissivity ?? null,
          })),
        )
        .returning({ id: thermalNodes.id, name: thermalNodes.name });

      // Create conductors
      if (template.conductors.length > 0) {
        const nodeMap = new Map(createdNodes.map((n) => [n.name, n.id]));
        await db.insert(conductors).values(
          template.conductors.map((c) => ({
            modelId: model.id,
            name: c.name,
            conductorType: c.conductorType,
            nodeFromId: nodeMap.get(c.fromNode)!,
            nodeToId: nodeMap.get(c.toNode)!,
            conductance: c.conductance ?? null,
            area: c.area ?? null,
            viewFactor: c.viewFactor ?? null,
            emissivity: c.emissivity ?? null,
          })),
        );
      }
    }

    return NextResponse.json(
      { project, model, redirectUrl: `/dashboard/projects/${project.id}/models/${model.id}` },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/onboarding error:', error);
    return serverErrorResponse();
  }
}
