import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import {
  thermalModels,
  thermalNodes,
  conductors,
  heatLoads,
  simulationRuns,
  simulationResults,
  advisorAnalyses,
  advisorMonthlyUsage,
  orgMembers,
} from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  forbiddenResponse,
} from '@/lib/utils/api-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';
import { runDeterministicChecks } from '@/lib/advisor/rules';
import { runLLMAdvisor } from '@/lib/advisor/llm';

interface RouteParams {
  params: Promise<{ id: string; mid: string }>;
}

const postBodySchema = z.object({
  runId: z.string().uuid().optional(),
});

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid } = await params;

    let role;
    try {
      role = await getUserProjectAccess(user.id, id);
    } catch (e) {
      if (e instanceof AccessDeniedError) return forbiddenResponse();
      throw e;
    }

    try {
      requireRole(role, 'viewer');
    } catch {
      return forbiddenResponse();
    }

    // Check monthly usage
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [usage] = await db
      .select()
      .from(advisorMonthlyUsage)
      .where(
        and(
          eq(advisorMonthlyUsage.userId, user.id),
          eq(advisorMonthlyUsage.yearMonth, yearMonth),
        ),
      );

    // Check if user is in any org (pro access)
    const [orgMembership] = await db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.userId, user.id));

    const isPro = !!orgMembership;
    if (!isPro && usage && usage.count >= 5) {
      return NextResponse.json(
        { error: 'Monthly advisor analysis limit reached (5/month). Upgrade to a team plan for unlimited access.' },
        { status: 429 },
      );
    }

    // Verify model belongs to project
    const [model] = await db
      .select()
      .from(thermalModels)
      .where(and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)));
    if (!model) return notFoundResponse('Model');

    // Parse body
    let body: z.infer<typeof postBodySchema> = {};
    try {
      const raw = await request.json();
      body = postBodySchema.parse(raw);
    } catch {
      // empty body is fine
    }

    // Load model data
    const nodes = await db
      .select()
      .from(thermalNodes)
      .where(eq(thermalNodes.modelId, mid));

    const modelConductors = await db
      .select()
      .from(conductors)
      .where(eq(conductors.modelId, mid));

    const modelHeatLoads = await db
      .select()
      .from(heatLoads)
      .where(eq(heatLoads.modelId, mid));

    // Load sim results
    let simResults: (typeof simulationResults.$inferSelect)[] = [];
    let runId: string | null = body.runId ?? null;

    if (!runId) {
      // Get latest completed run for this model
      const [latestRun] = await db
        .select()
        .from(simulationRuns)
        .where(
          and(
            eq(simulationRuns.modelId, mid),
            eq(simulationRuns.status, 'completed'),
          ),
        )
        .orderBy(desc(simulationRuns.createdAt))
        .limit(1);
      if (latestRun) runId = latestRun.id;
    }

    if (runId) {
      simResults = await db
        .select()
        .from(simulationResults)
        .where(eq(simulationResults.runId, runId));
    }

    // Run deterministic checks
    const deterministicFindings = runDeterministicChecks(
      nodes,
      modelConductors,
      modelHeatLoads,
      simResults.length > 0 ? simResults : undefined,
    );

    // Run LLM advisor
    let llmFindings: Awaited<ReturnType<typeof runLLMAdvisor>> = {
      findings: [],
      tokensUsed: 0,
    };

    // Build sim summary if we have results
    let simSummary: { minTemp: number; maxTemp: number; runId: string } | undefined;
    if (simResults.length > 0 && runId) {
      let minTemp = Infinity;
      let maxTemp = -Infinity;
      for (const sr of simResults) {
        if (sr.timeValues?.temperatures) {
          for (const t of sr.timeValues.temperatures) {
            if (t < minTemp) minTemp = t;
            if (t > maxTemp) maxTemp = t;
          }
        }
      }
      if (minTemp !== Infinity) {
        simSummary = { minTemp, maxTemp, runId };
      }
    }

    llmFindings = await runLLMAdvisor(
      {
        name: model.name,
        nodeCount: nodes.length,
        conductorCount: modelConductors.length,
        heatLoadCount: modelHeatLoads.length,
      },
      deterministicFindings,
      simSummary,
    );

    // Insert analysis record
    const [analysis] = await db
      .insert(advisorAnalyses)
      .values({
        modelId: mid,
        runId,
        userId: user.id,
        deterministicFindings,
        llmFindings: llmFindings.findings,
        tokensUsed: llmFindings.tokensUsed || null,
      })
      .returning();

    // Upsert monthly usage
    await db
      .insert(advisorMonthlyUsage)
      .values({
        userId: user.id,
        yearMonth,
        count: 1,
      })
      .onConflictDoUpdate({
        target: [advisorMonthlyUsage.userId, advisorMonthlyUsage.yearMonth],
        set: { count: sql`${advisorMonthlyUsage.count} + 1` },
      });

    return NextResponse.json({
      data: {
        analysis: {
          id: analysis.id,
          deterministicFindings: analysis.deterministicFindings,
          llmFindings: analysis.llmFindings,
          createdAt: analysis.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('POST /api/.../advisor error:', error);
    return serverErrorResponse();
  }
}

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid } = await params;

    let role;
    try {
      role = await getUserProjectAccess(user.id, id);
    } catch (e) {
      if (e instanceof AccessDeniedError) return forbiddenResponse();
      throw e;
    }

    try {
      requireRole(role, 'viewer');
    } catch {
      return forbiddenResponse();
    }

    // Verify model belongs to project
    const [model] = await db
      .select()
      .from(thermalModels)
      .where(and(eq(thermalModels.id, mid), eq(thermalModels.projectId, id)));
    if (!model) return notFoundResponse('Model');

    const analyses = await db
      .select()
      .from(advisorAnalyses)
      .where(eq(advisorAnalyses.modelId, mid))
      .orderBy(desc(advisorAnalyses.createdAt))
      .limit(10);

    return NextResponse.json({ data: { analyses } });
  } catch (error) {
    console.error('GET /api/.../advisor error:', error);
    return serverErrorResponse();
  }
}
