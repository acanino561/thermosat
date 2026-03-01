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
  customType,
  unique,
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

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'free',
  'academic',
  'starter',
  'pro',
  'team',
  'enterprise',
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

// ── Organization Enums ─────────────────────────────────────────────────────

export const orgRoleEnum = pgEnum('org_role', ['owner', 'admin', 'member']);

export const teamRoleEnum = pgEnum('team_role', ['admin', 'editor', 'viewer']);

// ── Organization Tables ────────────────────────────────────────────────────

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const orgMembers = pgTable(
  'org_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: orgRoleEnum('role').notNull().default('member'),
    invitedAt: timestamp('invited_at', { mode: 'date' }).defaultNow().notNull(),
    joinedAt: timestamp('joined_at', { mode: 'date' }),
  },
  (table) => ({
    orgIdIdx: index('org_members_org_id_idx').on(table.orgId),
    userIdIdx: index('org_members_user_id_idx').on(table.userId),
  }),
);

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdIdx: index('teams_org_id_idx').on(table.orgId),
  }),
);

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: teamRoleEnum('role').notNull().default('viewer'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index('team_members_team_id_idx').on(table.teamId),
    userIdIdx: index('team_members_user_id_idx').on(table.userId),
  }),
);

// ── SSO / SAML ─────────────────────────────────────────────────────────────

export const ssoConfigs = pgTable(
  'sso_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .unique()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    entityId: text('entity_id').notNull(),
    ssoUrl: text('sso_url').notNull(),
    certificate: text('certificate').notNull(),
    metadataUrl: text('metadata_url'),
    allowedDomains: text('allowed_domains').array().notNull().default([]),
    domainEnforced: boolean('domain_enforced').notNull().default(false),
    enabled: boolean('enabled').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdIdx: index('sso_configs_org_id_idx').on(table.orgId),
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
    orgId: uuid('org_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    description: text('description').default(''),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    isDemo: boolean('is_demo').default(false).notNull(),
  },
  (table) => ({
    userIdIdx: index('projects_user_id_idx').on(table.userId),
    orgIdIdx: index('projects_org_id_idx').on(table.orgId),
  }),
);

export const teamProjects = pgTable(
  'team_projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index('team_projects_team_id_idx').on(table.teamId),
    projectIdIdx: index('team_projects_project_id_idx').on(table.projectId),
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
  /** Body-frame unit vector pointing outward from this surface. */
  surfaceNormal?: { x: number; y: number; z: number };
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

export const sensitivityStatusEnum = pgEnum('sensitivity_status', [
  'pending',
  'running',
  'complete',
  'failed',
]);

export interface SensitivityEntry {
  parameterId: string;
  parameterType: 'node_property' | 'conductor' | 'heat_load';
  entityId: string;
  nodeId: string;
  dT_dp: number;
  secondOrderEstimate: number;
  baselineValue: number;
}

export const sensitivityMatrices = pgTable(
  'sensitivity_matrices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    runId: uuid('run_id')
      .notNull()
      .references(() => simulationRuns.id, { onDelete: 'cascade' }),
    status: sensitivityStatusEnum('status').default('pending').notNull(),
    computedAt: timestamp('computed_at', { mode: 'date' }),
    entries: jsonb('entries').$type<SensitivityEntry[]>(),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    runIdIdx: index('sensitivity_matrices_run_id_idx').on(table.runId),
  }),
);

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

// ── API Keys ───────────────────────────────────────────────────────────────

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    keyHash: text('key_hash').notNull().unique(),
    keyHint: text('key_hint').notNull(),
    label: text('label').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
    expiresAt: timestamp('expires_at', { mode: 'date' }),
    revokedAt: timestamp('revoked_at', { mode: 'date' }),
  },
  (table) => ({
    userIdIdx: index('api_keys_user_id_idx').on(table.userId),
    keyHashIdx: index('api_keys_key_hash_idx').on(table.keyHash),
  }),
);

// ── Failure Analysis ───────────────────────────────────────────────────────

export const failureTypeEnum = pgEnum('failure_type', [
  'heater_failure',
  'mli_degradation',
  'coating_degradation_eol',
  'attitude_loss_tumble',
  'power_budget_reduction',
  'conductor_failure',
  'component_power_spike',
]);

export const analysisStatusEnum = pgEnum('analysis_status', [
  'pending',
  'running',
  'completed',
  'failed',
]);

export const failureAnalyses = pgTable(
  'failure_analyses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => thermalModels.id, { onDelete: 'cascade' }),
    baseRunId: uuid('base_run_id').references(() => simulationRuns.id, {
      onDelete: 'set null',
    }),
    status: analysisStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { mode: 'date' }),
  },
  (table) => ({
    modelIdIdx: index('failure_analyses_model_id_idx').on(table.modelId),
  }),
);

export const failureCases = pgTable(
  'failure_cases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    analysisId: uuid('analysis_id')
      .notNull()
      .references(() => failureAnalyses.id, { onDelete: 'cascade' }),
    failureType: failureTypeEnum('failure_type').notNull(),
    label: text('label'),
    params: jsonb('params').notNull().default({}),
    runId: uuid('run_id').references(() => simulationRuns.id, {
      onDelete: 'set null',
    }),
    status: analysisStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    analysisIdIdx: index('failure_cases_analysis_id_idx').on(table.analysisId),
  }),
);

// ── Custom Types ───────────────────────────────────────────────────────────

const bytea = customType<{ data: Buffer; driverData: string }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value: Buffer): string {
    return `\\x${value.toString('hex')}`;
  },
  fromDriver(value: string): Buffer {
    // Neon HTTP returns hex-encoded string with \x prefix
    const hex = typeof value === 'string' && value.startsWith('\\x')
      ? value.slice(2)
      : typeof value === 'string' ? value : '';
    return Buffer.from(hex, 'hex');
  },
});

// ── Report Generation ──────────────────────────────────────────────────────

export const reportStatusEnum = pgEnum('report_status', [
  'generating',
  'complete',
  'failed',
]);

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    resultId: uuid('result_id')
      .notNull()
      .references(() => simulationRuns.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    modelId: uuid('model_id')
      .notNull()
      .references(() => thermalModels.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: reportStatusEnum('status').default('generating').notNull(),
    errorMessage: text('error_message'),
    pdfBuffer: bytea('pdf_buffer'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  },
  (table) => ({
    resultIdIdx: index('reports_result_id_idx').on(table.resultId),
    userIdIdx: index('reports_user_id_idx').on(table.userId),
  }),
);

// ── Design Space Exploration ───────────────────────────────────────────────

export const explorationStatusEnum = pgEnum('exploration_status', [
  'pending',
  'running',
  'completed',
  'failed',
]);

export const designExplorations = pgTable(
  'design_explorations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => thermalModels.id, { onDelete: 'cascade' }),
    config: jsonb('config').notNull(),
    status: explorationStatusEnum('status').default('pending').notNull(),
    numSamples: integer('num_samples').notNull(),
    completedSamples: integer('completed_samples').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { mode: 'date' }),
  },
  (table) => ({
    modelIdIdx: index('design_explorations_model_id_idx').on(table.modelId),
  }),
);

export const explorationResults = pgTable(
  'exploration_results',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    explorationId: uuid('exploration_id')
      .notNull()
      .references(() => designExplorations.id, { onDelete: 'cascade' }),
    sampleIndex: integer('sample_index').notNull(),
    paramValues: jsonb('param_values').notNull(),
    nodeResults: jsonb('node_results').notNull(),
    feasible: boolean('feasible').notNull().default(true),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    explorationIdIdx: index('exploration_results_exploration_id_idx').on(table.explorationId),
  }),
);

// ── Collaboration & Review ─────────────────────────────────────────────────

export const sharePermissionEnum = pgEnum('share_permission', ['view', 'edit']);

export const shareLinks = pgTable(
  'share_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => thermalModels.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    permission: sharePermissionEnum('permission').default('view').notNull(),
    token: text('token').notNull().unique(),
    accessCount: integer('access_count').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date' }),
    revokedAt: timestamp('revoked_at', { mode: 'date' }),
  },
  (table) => ({
    modelIdIdx: index('share_links_model_id_idx').on(table.modelId),
    tokenIdx: index('share_links_token_idx').on(table.token),
  }),
);

export const modelComments = pgTable(
  'model_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => thermalModels.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    position3d: jsonb('position_3d').$type<{ x: number; y: number; z: number }>(),
    nodeId: uuid('node_id').references(() => thermalNodes.id, { onDelete: 'set null' }),
    content: text('content').notNull(),
    mentions: jsonb('mentions').$type<string[]>().default([]).notNull(),
    resolved: boolean('resolved').default(false).notNull(),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    modelIdIdx: index('model_comments_model_id_idx').on(table.modelId),
  }),
);

// ── AI Advisor ─────────────────────────────────────────────────────────────

export const advisorAnalyses = pgTable(
  'advisor_analyses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => thermalModels.id, { onDelete: 'cascade' }),
    runId: uuid('run_id').references(() => simulationRuns.id, {
      onDelete: 'set null',
    }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deterministicFindings: jsonb('deterministic_findings').notNull().default([]),
    llmFindings: jsonb('llm_findings'),
    tokensUsed: integer('tokens_used'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    modelIdIdx: index('advisor_analyses_model_id_idx').on(table.modelId),
    userIdIdx: index('advisor_analyses_user_id_idx').on(table.userId),
  }),
);

export const advisorMonthlyUsage = pgTable(
  'advisor_monthly_usage',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    yearMonth: text('year_month').notNull(),
    count: integer('count').notNull().default(0),
  },
  (table) => ({
    uniqueUserMonth: unique().on(table.userId, table.yearMonth),
  }),
);

// ── Audit Trail ────────────────────────────────────────────────────────────

export const auditActionEnum = pgEnum('audit_action', [
  'project.created', 'project.updated', 'project.deleted',
  'model.created', 'model.updated', 'model.deleted',
  'node.created', 'node.updated', 'node.deleted',
  'conductor.created', 'conductor.updated', 'conductor.deleted',
  'simulation.run', 'simulation.completed',
  'share.created', 'share.revoked',
  'comment.created', 'comment.resolved',
  'review_status.changed',
  'api_key.created', 'api_key.revoked',
  'member.invited', 'member.removed',
]);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'set null' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    modelId: uuid('model_id').references(() => thermalModels.id, { onDelete: 'set null' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: auditActionEnum('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    before: jsonb('before'),
    after: jsonb('after'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdIdx: index('audit_logs_org_id_idx').on(table.orgId),
    projectIdIdx: index('audit_logs_project_id_idx').on(table.projectId),
    userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  }),
);

export const reviewStatusEnum = pgEnum('review_status_type', [
  'draft',
  'in_review',
  'approved',
  'needs_changes',
]);

export const reviewStatuses = pgTable(
  'review_statuses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => thermalModels.id, { onDelete: 'cascade' }),
    status: reviewStatusEnum('status').default('draft').notNull(),
    changedBy: uuid('changed_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    note: text('note'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    modelIdIdx: index('review_statuses_model_id_idx').on(table.modelId),
  }),
);

// ── Subscriptions / Billing ────────────────────────────────────────────────

// ── Webhooks ───────────────────────────────────────────────────────────────

export const webhooks = pgTable(
  'webhooks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    url: text('url').notNull(),
    secretHash: text('secret_hash').notNull(),
    label: text('label').notNull(),
    events: jsonb('events').$type<string[]>().notNull().default([]),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('webhooks_user_id_idx').on(table.userId),
  }),
);

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    webhookId: uuid('webhook_id')
      .notNull()
      .references(() => webhooks.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    status: text('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastAttemptAt: timestamp('last_attempt_at', { mode: 'date' }),
    httpStatus: integer('http_status'),
    responseBody: text('response_body'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    webhookIdIdx: index('webhook_deliveries_webhook_id_idx').on(table.webhookId),
  }),
);

// ── Subscriptions / Billing ────────────────────────────────────────────────

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id),
    orgId: uuid('org_id').references(() => organizations.id),
    tier: subscriptionTierEnum('tier').notNull().default('free'),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    status: text('status').notNull().default('active'),
    currentPeriodEnd: timestamp('current_period_end', { mode: 'date' }),
    seatCount: integer('seat_count').notNull().default(1),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
    orgIdIdx: index('subscriptions_org_id_idx').on(table.orgId),
    stripeCustomerIdIdx: index('subscriptions_stripe_customer_id_idx').on(table.stripeCustomerId),
    stripeSubscriptionIdUnique: unique('subscriptions_stripe_subscription_id_unique').on(table.stripeSubscriptionId),
  }),
);
