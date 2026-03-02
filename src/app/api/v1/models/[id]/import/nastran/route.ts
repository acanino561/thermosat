import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { thermalModels, thermalNodes, conductors, materials } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateApiKey, isErrorResponse } from '@/lib/utils/v1-helpers';
import { getUserProjectAccess, requireRole, AccessDeniedError } from '@/lib/auth/access';
import { parseBdf } from '@/lib/import/nastran-bdf-parser';
import { mapBdfToVerixos } from '@/lib/import/nastran-mapper';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = ['.bdf', '.dat'];

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticateApiKey(request);
    if (isErrorResponse(auth)) return auth;

    const { id: modelId } = await params;

    // Validate model exists
    const [model] = await db.select().from(thermalModels).where(eq(thermalModels.id, modelId));
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // Auth: user must have editor+ access to the project
    let role;
    try {
      role = await getUserProjectAccess(auth.userId, model.projectId);
    } catch (e) {
      if (e instanceof AccessDeniedError) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      throw e;
    }
    try {
      requireRole(role, 'editor');
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');
    const mode = (formData.get('mode') as string) || 'replace';

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing required file field. Upload a .bdf or .dat file.' },
        { status: 400 },
      );
    }

    // Validate file extension
    const fileName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    if (!hasValidExt) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024} MB` },
        { status: 400 },
      );
    }

    // Read file content
    const content = await file.text();
    if (!content.trim()) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 },
      );
    }

    // Parse BDF
    const bdfData = parseBdf(content);

    if (bdfData.grids.length === 0) {
      return NextResponse.json(
        { error: 'No GRID points found in BDF file. Cannot create model.' },
        { status: 400 },
      );
    }

    // Map to Verixos entities
    const mapped = mapBdfToVerixos(bdfData, modelId, auth.userId, model.projectId);

    // Check existing data
    const existingNodes = await db
      .select()
      .from(thermalNodes)
      .where(eq(thermalNodes.modelId, modelId));

    if (existingNodes.length > 0 && mode === 'replace') {
      // Delete existing model data (cascading from nodes handles conductors via FK)
      await db.delete(conductors).where(eq(conductors.modelId, modelId));
      await db.delete(thermalNodes).where(eq(thermalNodes.modelId, modelId));
    } else if (existingNodes.length > 0 && mode !== 'append') {
      return NextResponse.json(
        {
          error: 'Model already has nodes. Set mode=replace or mode=append.',
          existingNodeCount: existingNodes.length,
        },
        { status: 409 },
      );
    }

    // Insert materials
    if (mapped.materials.length > 0) {
      await db.insert(materials).values(
        mapped.materials.map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          absorptivity: m.absorptivity,
          emissivity: m.emissivity,
          conductivity: m.conductivity,
          specificHeat: m.specificHeat,
          density: m.density,
          tempRangeMin: m.tempRangeMin,
          tempRangeMax: m.tempRangeMax,
          isDefault: m.isDefault,
          userId: m.userId,
          projectId: m.projectId,
        })),
      );
    }

    // Insert nodes
    if (mapped.nodes.length > 0) {
      await db.insert(thermalNodes).values(
        mapped.nodes.map((n) => ({
          id: n.id,
          modelId: n.modelId,
          name: n.name,
          nodeType: n.nodeType,
          temperature: n.temperature,
          capacitance: n.capacitance,
          boundaryTemp: n.boundaryTemp,
          materialId: n.materialId,
          area: n.area,
          mass: n.mass,
          absorptivity: n.absorptivity,
          emissivity: n.emissivity,
        })),
      );
    }

    // Insert conductors
    if (mapped.conductors.length > 0) {
      await db.insert(conductors).values(
        mapped.conductors.map((c) => ({
          id: c.id,
          modelId: c.modelId,
          name: c.name,
          conductorType: c.conductorType,
          nodeFromId: c.nodeFromId,
          nodeToId: c.nodeToId,
          conductance: c.conductance,
          area: c.area,
          viewFactor: c.viewFactor,
          emissivity: c.emissivity,
        })),
      );
    }

    return NextResponse.json({
      success: true,
      imported: {
        nodes: mapped.nodes.length,
        conductors: mapped.conductors.length,
        materials: mapped.materials.length,
      },
      warnings: mapped.warnings,
    });
  } catch (error) {
    console.error('POST /api/v1/models/[id]/import/nastran error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
