import { relations } from 'drizzle-orm';
import {
  users,
  accounts,
  sessions,
  projects,
  thermalModels,
  modelSnapshots,
  thermalNodes,
  conductors,
  heatLoads,
  materials,
  simulationConfigs,
  simulationRuns,
  simulationResults,
} from './schema';

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  projects: many(projects),
  materials: many(materials),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  thermalModels: many(thermalModels),
  materials: many(materials),
}));

export const thermalModelsRelations = relations(
  thermalModels,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [thermalModels.projectId],
      references: [projects.id],
    }),
    nodes: many(thermalNodes),
    conductors: many(conductors),
    heatLoads: many(heatLoads),
    snapshots: many(modelSnapshots),
    simulationConfigs: many(simulationConfigs),
    simulationRuns: many(simulationRuns),
  }),
);

export const modelSnapshotsRelations = relations(modelSnapshots, ({ one }) => ({
  model: one(thermalModels, {
    fields: [modelSnapshots.modelId],
    references: [thermalModels.id],
  }),
}));

export const thermalNodesRelations = relations(
  thermalNodes,
  ({ one, many }) => ({
    model: one(thermalModels, {
      fields: [thermalNodes.modelId],
      references: [thermalModels.id],
    }),
    material: one(materials, {
      fields: [thermalNodes.materialId],
      references: [materials.id],
    }),
    heatLoads: many(heatLoads),
    simulationResults: many(simulationResults),
  }),
);

export const conductorsRelations = relations(conductors, ({ one }) => ({
  model: one(thermalModels, {
    fields: [conductors.modelId],
    references: [thermalModels.id],
  }),
  nodeFrom: one(thermalNodes, {
    fields: [conductors.nodeFromId],
    references: [thermalNodes.id],
    relationName: 'conductorFrom',
  }),
  nodeTo: one(thermalNodes, {
    fields: [conductors.nodeToId],
    references: [thermalNodes.id],
    relationName: 'conductorTo',
  }),
}));

export const heatLoadsRelations = relations(heatLoads, ({ one }) => ({
  model: one(thermalModels, {
    fields: [heatLoads.modelId],
    references: [thermalModels.id],
  }),
  node: one(thermalNodes, {
    fields: [heatLoads.nodeId],
    references: [thermalNodes.id],
  }),
}));

export const materialsRelations = relations(materials, ({ one }) => ({
  user: one(users, {
    fields: [materials.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [materials.projectId],
    references: [projects.id],
  }),
}));

export const simulationConfigsRelations = relations(
  simulationConfigs,
  ({ one, many }) => ({
    model: one(thermalModels, {
      fields: [simulationConfigs.modelId],
      references: [thermalModels.id],
    }),
    runs: many(simulationRuns),
  }),
);

export const simulationRunsRelations = relations(
  simulationRuns,
  ({ one, many }) => ({
    model: one(thermalModels, {
      fields: [simulationRuns.modelId],
      references: [thermalModels.id],
    }),
    config: one(simulationConfigs, {
      fields: [simulationRuns.configId],
      references: [simulationConfigs.id],
    }),
    results: many(simulationResults),
  }),
);

export const simulationResultsRelations = relations(
  simulationResults,
  ({ one }) => ({
    run: one(simulationRuns, {
      fields: [simulationResults.runId],
      references: [simulationRuns.id],
    }),
    node: one(thermalNodes, {
      fields: [simulationResults.nodeId],
      references: [thermalNodes.id],
    }),
  }),
);
