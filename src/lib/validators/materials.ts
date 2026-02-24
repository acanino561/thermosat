import { z } from 'zod';

export const materialCategorySchema = z.enum([
  'metal',
  'composite',
  'mli',
  'paint',
  'osr',
  'adhesive',
]);

export const createMaterialSchema = z.object({
  name: z.string().min(1).max(200),
  category: materialCategorySchema,
  absorptivity: z.number().min(0).max(1),
  emissivity: z.number().min(0).max(1),
  conductivity: z.number().min(0), // W/(m·K)
  specificHeat: z.number().positive(), // J/(kg·K)
  density: z.number().positive(), // kg/m³
  tempRangeMin: z.number().min(0), // K
  tempRangeMax: z.number().min(0), // K
  projectId: z.string().uuid().optional(),
});

export const updateMaterialSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: materialCategorySchema.optional(),
  absorptivity: z.number().min(0).max(1).optional(),
  emissivity: z.number().min(0).max(1).optional(),
  conductivity: z.number().min(0).optional(),
  specificHeat: z.number().positive().optional(),
  density: z.number().positive().optional(),
  tempRangeMin: z.number().min(0).optional(),
  tempRangeMax: z.number().min(0).optional(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
