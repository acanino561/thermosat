import { z } from 'zod';

export const simulationTypeSchema = z.enum(['transient', 'steady_state']);

export const runSimulationSchema = z
  .object({
    simulationType: simulationTypeSchema,
    config: z.object({
      timeStart: z.number().min(0).default(0),
      timeEnd: z.number().positive().default(3600),
      timeStep: z.number().positive().default(1),
      maxIterations: z.number().int().positive().default(1000),
      tolerance: z.number().positive().default(1e-6),
      minStep: z.number().positive().optional(),
      maxStep: z.number().positive().optional(),
    }),
  })
  .refine(
    (data) => {
      if (data.simulationType === 'transient') {
        return data.config.timeEnd > data.config.timeStart;
      }
      return true;
    },
    {
      message: 'timeEnd must be greater than timeStart for transient simulations',
      path: ['config', 'timeEnd'],
    },
  )
  .refine(
    (data) => {
      if (data.simulationType === 'transient') {
        return data.config.timeStep <= data.config.timeEnd - data.config.timeStart;
      }
      return true;
    },
    {
      message: 'timeStep must be smaller than simulation duration',
      path: ['config', 'timeStep'],
    },
  );

export const exportFormatSchema = z.enum(['csv', 'json']).default('json');

export type RunSimulationInput = z.infer<typeof runSimulationSchema>;
export type ExportFormat = z.infer<typeof exportFormatSchema>;
