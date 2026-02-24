import { z } from 'zod';

export const nodeTypeSchema = z.enum(['diffusion', 'arithmetic', 'boundary']);

export const createNodeSchema = z
  .object({
    name: z.string().min(1).max(200),
    nodeType: nodeTypeSchema,
    temperature: z.number().min(0).max(10000), // K
    capacitance: z.number().positive().optional(), // J/K
    boundaryTemp: z.number().min(0).max(10000).optional(), // K
    materialId: z.string().uuid().optional(),
    area: z.number().positive().optional(), // m²
    mass: z.number().positive().optional(), // kg
    absorptivity: z.number().min(0).max(1).optional(),
    emissivity: z.number().min(0).max(1).optional(),
  })
  .refine(
    (data) => {
      if (data.nodeType === 'diffusion') {
        return data.capacitance !== undefined && data.capacitance > 0;
      }
      return true;
    },
    {
      message: 'Diffusion nodes require a positive capacitance',
      path: ['capacitance'],
    },
  )
  .refine(
    (data) => {
      if (data.nodeType === 'boundary') {
        return data.boundaryTemp !== undefined;
      }
      return true;
    },
    {
      message: 'Boundary nodes require a boundary temperature',
      path: ['boundaryTemp'],
    },
  );

export const updateNodeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nodeType: nodeTypeSchema.optional(),
  temperature: z.number().min(0).max(10000).optional(),
  capacitance: z.number().positive().nullable().optional(),
  boundaryTemp: z.number().min(0).max(10000).nullable().optional(),
  materialId: z.string().uuid().nullable().optional(),
  area: z.number().positive().nullable().optional(),
  mass: z.number().positive().nullable().optional(),
  absorptivity: z.number().min(0).max(1).nullable().optional(),
  emissivity: z.number().min(0).max(1).nullable().optional(),
});

export type CreateNodeInput = z.infer<typeof createNodeSchema>;
export type UpdateNodeInput = z.infer<typeof updateNodeSchema>;
