import { z } from 'zod';

export const conductorTypeSchema = z.enum(['linear', 'radiation', 'contact', 'heat_pipe']);

const conductancePointSchema = z.object({
  temperature: z.number(), // K
  conductance: z.number().positive(),
});

const conductanceDataSchema = z.object({
  points: z
    .array(conductancePointSchema)
    .min(2, 'At least 2 points required')
    .max(20, 'Maximum 20 points allowed')
    .refine(
      (points) => {
        const temps = points.map((p) => p.temperature);
        return new Set(temps).size === temps.length;
      },
      { message: 'Temperatures must be unique' },
    )
    .refine(
      (points) => {
        for (let i = 1; i < points.length; i++) {
          if (points[i].temperature <= points[i - 1].temperature) return false;
        }
        return true;
      },
      { message: 'Points must be sorted ascending by temperature' },
    ),
});

export const createConductorSchema = z
  .object({
    name: z.string().min(1).max(200),
    conductorType: conductorTypeSchema,
    nodeFromId: z.string().uuid(),
    nodeToId: z.string().uuid(),
    conductance: z.number().positive().optional(), // W/K
    area: z.number().positive().optional(), // m²
    viewFactor: z.number().min(0).max(1).optional(),
    emissivity: z.number().min(0).max(1).optional(),
    conductanceData: conductanceDataSchema.optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.conductorType === 'linear' || data.conductorType === 'contact') {
        return data.conductance !== undefined && data.conductance > 0;
      }
      return true;
    },
    {
      message: 'Linear and contact conductors require a positive conductance',
      path: ['conductance'],
    },
  )
  .refine(
    (data) => {
      if (data.conductorType === 'radiation') {
        return (
          data.area !== undefined &&
          data.area > 0 &&
          data.viewFactor !== undefined &&
          data.emissivity !== undefined
        );
      }
      return true;
    },
    {
      message: 'Radiation conductors require area, viewFactor, and emissivity',
      path: ['area'],
    },
  )
  .refine(
    (data) => {
      if (data.conductorType === 'heat_pipe') {
        return (
          data.conductanceData !== undefined &&
          data.conductanceData !== null &&
          data.conductanceData.points.length >= 2
        );
      }
      return true;
    },
    {
      message: 'Heat pipe conductors require conductanceData with at least 2 points',
      path: ['conductanceData'],
    },
  )
  .refine(
    (data) => data.nodeFromId !== data.nodeToId,
    {
      message: 'A conductor cannot connect a node to itself',
      path: ['nodeToId'],
    },
  );

export const updateConductorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  conductorType: conductorTypeSchema.optional(),
  nodeFromId: z.string().uuid().optional(),
  nodeToId: z.string().uuid().optional(),
  conductance: z.number().positive().nullable().optional(),
  area: z.number().positive().nullable().optional(),
  viewFactor: z.number().min(0).max(1).nullable().optional(),
  emissivity: z.number().min(0).max(1).nullable().optional(),
  conductanceData: conductanceDataSchema.nullable().optional(),
});

export type CreateConductorInput = z.infer<typeof createConductorSchema>;
export type UpdateConductorInput = z.infer<typeof updateConductorSchema>;
