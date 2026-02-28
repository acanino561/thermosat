import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { simulationRuns, reports } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  verifyProjectOwnership,
  verifyModelOwnership,
} from '@/lib/utils/api-helpers';
import { generateThermalReport } from '@/lib/reports/pdf-generator';

interface RouteParams {
  params: Promise<{ id: string; mid: string; rid: string }>;
}

export async function POST(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid, rid } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');
    const model = await verifyModelOwnership(mid, id);
    if (!model) return notFoundResponse('Model');

    // Verify run belongs to this model and is completed
    const [run] = await db
      .select()
      .from(simulationRuns)
      .where(
        and(eq(simulationRuns.id, rid), eq(simulationRuns.modelId, mid)),
      );
    if (!run) return notFoundResponse('Simulation run');
    if (run.status !== 'completed') {
      return NextResponse.json(
        { error: 'Simulation must be completed before generating a report' },
        { status: 400 },
      );
    }

    // Create report record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const [report] = await db
      .insert(reports)
      .values({
        resultId: rid,
        projectId: id,
        modelId: mid,
        userId: user.id,
        status: 'generating',
        expiresAt,
      })
      .returning();

    // Background generation
    const reportId = report.id;
    setTimeout(async () => {
      try {
        const pdfBuffer = await generateThermalReport(rid, id, mid, user.id);
        await db
          .update(reports)
          .set({ status: 'complete', pdfBuffer })
          .where(eq(reports.id, reportId));
      } catch (error) {
        console.error('Report generation failed:', error);
        await db
          .update(reports)
          .set({
            status: 'failed',
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
          })
          .where(eq(reports.id, reportId));
      }
    }, 0);

    return NextResponse.json({
      reportId: report.id,
      status: 'generating',
    });
  } catch (error) {
    console.error('POST /api/.../report error:', error);
    return serverErrorResponse();
  }
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse | Response> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const { id, mid, rid } = await params;
    const project = await verifyProjectOwnership(id, user.id);
    if (!project) return notFoundResponse('Project');
    const model = await verifyModelOwnership(mid, id);
    if (!model) return notFoundResponse('Model');

    // Find the latest report for this run
    const [report] = await db
      .select()
      .from(reports)
      .where(
        and(
          eq(reports.resultId, rid),
          eq(reports.userId, user.id),
        ),
      );

    if (!report) return notFoundResponse('Report');

    if (report.status === 'generating') {
      return NextResponse.json(
        { reportId: report.id, status: 'generating' },
        { status: 202 },
      );
    }

    if (report.status === 'failed') {
      return NextResponse.json(
        {
          reportId: report.id,
          status: 'failed',
          error: report.errorMessage ?? 'Report generation failed',
        },
        { status: 500 },
      );
    }

    if (!report.pdfBuffer) {
      return NextResponse.json(
        { error: 'Report PDF not available' },
        { status: 500 },
      );
    }

    const filename = `Verixos_Report_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    return new Response(new Uint8Array(report.pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': report.pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('GET /api/.../report error:', error);
    return serverErrorResponse();
  }
}
