import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  doublePrecision,
  jsonb,
  pgEnum,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';

// ── Enums ──────────────────────────────────────────────────────────────────

export const nodeTypeEnum = pgEnum('node_type', [
  'diffusion',
  'arithmetic',
  'boundary',
]);

export const conductorTypeEnum = pgEnum('conductor_type', [
  'linear',
  'radiation',
  'contact',
  'heat_pipe',
]);

export const heatLoadTypeEnum = pgEnum('heat_load_type', [
  'constant',
  'time_varying',
  'orbital',
]);

export const materialCategoryEnum = pgEnum('material_category', [
  'metal',
  'composite',
  'mli',
  'paint',
  'osr',
  'adhesive',
]);

export const simulationStatusEnum = pgEnum('simulation_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

export const simulationTypeEnum = pgEnum('simulation_type', [
  'transient',
  'steady_state',
]);

// ── NextAuth Tables ────────────────────────────────────────────────────────

export const unitsPrefEnum = pgEnum('units_pref', ['si', 'imperial']);

export const tempUnitEnum = pgEnum('temp_unit', ['K', 'C', 'F']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  password: text('password'), // bcrypt hash, null for OAuth-only users
  organization: text('organization'),
  roleTitle: text('role_title'),
  unitsPref: unitsPrefEnum('units_pref').default('si'),
  tempUnit: tempUnitEnum('temp_unit').default('K'),
  deletedAt: timestamp('deleted_at', { mode: 'date' }), // soft delete
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.provider, table.providerAccountId],
    }),
  }),
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.identifier, table.token],
    }),
  }),
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    identifier: text('identifier').notNull(), // email
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.identifier, table.token],
    }),
  }),
);

// ── Application Tables ─────────────────────────────────────────────────────

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').default(''),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('projects_user_id_idx').on(table.userId),
  }),
);

// Orbital config stored as JSON
export interface OrbitalConfig {
  altitude: number; // km
  inclination: number; // degrees
  raan: number; // degrees
  epoch: string; // ISO date
}

export const thermalModels = pgTable(
  'thermal_models',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').default(''),
    orbitalConfig: jsonb('orbital_config').$type<OrbitalConfig>(),
    version: integer('version').default(1).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index('thermal_models_project_id_idx').on(table.projectId),
  }),
);

export interface ModelSnapshotData {
  nodes: unknown[];
  conductors: unknown[];
  heatLoads: unknown[];
  orbitalConfig: OrbitalConfig | null;
}

export const modelSnapshots = pgTable(
  'model_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => thermalModels.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    description: text('description').default('Auto-save').notNull(),
    snapshot: jsonb('snapshot').$type<ModelSnapshotData>().notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    modelIdIdx: index('model_snapshots_model_id_idx').on(table.modelId),
  }),
);

export const thermalNodes = pgTable(
  'thermal_nodes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => thermalModels.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    nodeType: nodeTypeEnum('node_type').notNull(),
    temperature: doublePrecision('temperature').notNull(), // initial temp in K
    capacitance: doublePrecision('capacitance'), // J/K, for diffusion nodes
    boundaryTemp: doublePrecision('boundary_temp'), // K, for boundary nodes
    materialId: uuid('material_id').references(() => materials.id, {
      onDelete: 'set null',
    }),
    area: doublePrecision('area'), // m², surface area
    mass: doublePrecision('mass'), // kg
    absorptivity: doublePrecision('absorptivity'), // α_s override
    emissivity: doublePrecision('emissivity'), // ε_IR override
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    modelIdIdx: index('thermal_nodes_model_id_idx').on(table.modelId),
  }),
);

export const conductors = pgTable(
  'conductors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => thermalModels.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    conductorType: conductorTypeEnum('conductor_type').notNull(),
    nodeFromId: uuid('node_from_id')
      .notNull()
      .references(() => thermalNodes.id, { onDelete: 'cascade' }),
    nodeToId: uuid('node_to_id')
      .notNull()
      .references(() => thermalNodes.id, { onDelete: 'cascade' }),
    conductance: doublePrecision('conductance'), // W/K for linear/contact
    area: doublePrecision('area'), // m² for radiation
    viewFactor: doublePrecision('view_factor'), // F for radiation
    emissivity: doublePrecision('emissivity'), // effective ε for radiation
    conductanceData: jsonb('conductance_data').$type<ConductanceData>(), // for heat_pipe
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    modelIdIdx: index('conductors_model_id_idx').on(table.modelId),
  }),
);

export interface ConductanceDataPoint {
  temperature: number; // K
  conductance: number; // W/K
}

export interface ConductanceData {
  points: ConductanceDataPoint[];
}

export interface TimeValuePair {
  time: number;
  value: number;
}

export interface OrbitalHeatLoadParams {
  surfaceType: 'solar' | 'earth_facing' | 'anti_earth' | 'custom';
  absorptivity: number;
  emissivity: number;
  area: number;
}

export const heatLoads = pgTable(
  'heat_loads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => thermalModels.id, { onDelete: 'cascade' }),
    nodeId: uuid('node_id')
      .notNull()
      .references(() => thermalNodes.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    loadType: heatLoadTypeEnum('load_type').notNull(),
    value: doublePrecision('value'), // W for constant
    timeValues: jsonb('time_values').$type<TimeValuePair[]>(), // piecewise linear
    orbitalParams: jsonb('orbital_params').$type<OrbitalHeatLoadParams>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    modelIdIdx: index('heat_loads_model_id_idx').on(table.modelId),
  }),
);

export const materials = pgTable(
  'materials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    category: materialCategoryEnum('category').notNull(),
    absorptivity: doublePrecision('absorptivity').notNull(),
    emissivity: doublePrecision('emissivity').notNull(),
    conductivity: doublePrecision('conductivity').notNull(),
    specificHeat: doublePrecision('specific_heat').notNull(),
    density: doublePrecision('density').notNull(),
    tempRangeMin: doublePrecision('temp_range_min').notNull(),
    tempRangeMax: doublePrecision('temp_range_max').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    isDefaultIdx: index('materials_is_default_idx').on(table.isDefault),
    userIdIdx: index('materials_user_id_idx').on(table.userId),
  }),
);

export interface SimulationConfigData {
  timeStart: number; // seconds
  timeEnd: number; // seconds
  timeStep: number; // seconds
  maxIterations: number;
  tolerance: number;
  minStep?: number;
  maxStep?: number;
  outputInterval?: number; // seconds, how often to record results
}

export interface EnvironmentPreset {
  name: 'hot' | 'cold' | 'nominal' | 'custom';
  solarFlux: number; // W/m²
  albedo: number;
  earthIR: number; // W/m²
}

export interface SimulationConfigFull {
  transient: {
    duration: number; // seconds
    timeStep: number; // seconds
    outputInterval: number; // seconds
    tolerance: number;
    minStep?: number;
    maxStep?: number;
  };
  steadyState: {
    maxIterations: number;
    tolerance: number;
  };
  environment: EnvironmentPreset;
}

export const simulationConfigs = pgTable(
  'simulation_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => thermalModels.id, { onDelete: 'cascade' }),
    name: text('name').notNull().default('Default'),
    config: jsonb('config').$type<SimulationConfigFull>().notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    modelIdIdx: index('simulation_configs_model_id_idx').on(table.modelId),
  }),
);

export const simulationRuns = pgTable(
  'simulation_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => thermalModels.id, { onDelete: 'cascade' }),
    configId: uuid('config_id')
      .references(() => simulationConfigs.id, { onDelete: 'set null' }),
    status: simulationStatusEnum('status').default('pending').notNull(),
    simulationType: simulationTypeEnum('simulation_type').notNull(),
    config: jsonb('config').$type<SimulationConfigData>().notNull(),
    progress: integer('progress').default(0).notNull(),
    startedAt: timestamp('started_at', { mode: 'date' }),
    completedAt: timestamp('completed_at', { mode: 'date' }),
    errorMessage: text('error_message'),
    energyBalanceError: doublePrecision('energy_balance_error'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    modelIdIdx: index('simulation_runs_model_id_idx').on(table.modelId),
  }),
);

export interface NodeTemperatureHistory {
  times: number[];
  temperatures: number[];
}

export interface ConductorFlowHistory {
  conductorId: string;
  times: number[];
  flows: number[];
}

export const simulationResults = pgTable(
  'simulation_results',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    runId: uuid('run_id')
      .notNull()
      .references(() => simulationRuns.id, { onDelete: 'cascade' }),
    nodeId: uuid('node_id')
      .notNull()
      .references(() => thermalNodes.id, { onDelete: 'cascade' }),
    timeValues: jsonb('time_values').$type<NodeTemperatureHistory>().notNull(),
    conductorFlows: jsonb('conductor_flows').$type<ConductorFlowHistory[]>(),
  },
  (table) => ({
    runIdIdx: index('simulation_results_run_id_idx').on(table.runId),
  }),
);
