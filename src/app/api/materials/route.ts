import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { materials } from '@/lib/db/schema';
import { eq, or, and, isNull } from 'drizzle-orm';
import { createMaterialSchema } from '@/lib/validators/materials';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  validationErrorResponse,
  serverErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api-helpers';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();

    // Get query params for filtering
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const projectId = url.searchParams.get('projectId');

    // Always include default materials
    // If authenticated, also include user's custom materials
    let allMaterials;

    if (user) {
      if (category) {
        const validCategories = ['metal', 'composite', 'mli', 'paint', 'osr', 'adhesive'] as const;
        if (!validCategories.includes(category as typeof validCategories[number])) {
          return NextResponse.json(
            { error: 'Invalid category' },
            { status: 400 },
          );
        }

        allMaterials = await db
          .select()
          .from(materials)
          .where(
            and(
              eq(materials.category, category as typeof validCategories[number]),
              or(
                eq(materials.isDefault, true),
                eq(materials.userId, user.id),
              ),
            ),
          );
      } else {
        allMaterials = await db
          .select()
          .from(materials)
          .where(
            or(
              eq(materials.isDefault, true),
              eq(materials.userId, user.id),
            ),
          );
      }
    } else {
      // Unauthenticated: only default materials
      if (category) {
        const validCategories = ['metal', 'composite', 'mli', 'paint', 'osr', 'adhesive'] as const;
        if (!validCategories.includes(category as typeof validCategories[number])) {
          return NextResponse.json(
            { error: 'Invalid category' },
            { status: 400 },
          );
        }

        allMaterials = await db
          .select()
          .from(materials)
          .where(
            and(
              eq(materials.isDefault, true),
              eq(materials.category, category as typeof validCategories[number]),
            ),
          );
      } else {
        allMaterials = await db
          .select()
          .from(materials)
          .where(eq(materials.isDefault, true));
      }
    }

    // Filter by projectId if provided
    if (projectId && user) {
      allMaterials = allMaterials.filter(
        (m) => m.isDefault || m.projectId === projectId || m.projectId === null,
      );
    }

    return NextResponse.json({ materials: allMaterials });
  } catch (error) {
    console.error('GET /api/materials error:', error);
    return serverErrorResponse();
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse();

    const body = await parseJsonBody(request);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const parsed = createMaterialSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    // Validate temp range
    if (parsed.data.tempRangeMin >= parsed.data.tempRangeMax) {
      return NextResponse.json(
        { error: 'tempRangeMin must be less than tempRangeMax' },
        { status: 400 },
      );
    }

    const [material] = await db
      .insert(materials)
      .values({
        name: parsed.data.name,
        category: parsed.data.category,
        absorptivity: parsed.data.absorptivity,
        emissivity: parsed.data.emissivity,
        conductivity: parsed.data.conductivity,
        specificHeat: parsed.data.specificHeat,
        density: parsed.data.density,
        tempRangeMin: parsed.data.tempRangeMin,
        tempRangeMax: parsed.data.tempRangeMax,
        isDefault: false,
        userId: user.id,
        projectId: parsed.data.projectId ?? null,
      })
      .returning();

    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    console.error('POST /api/materials error:', error);
    return serverErrorResponse();
  }
}
