# Spacecraft Thermal Analysis SaaS — Backend Architecture

## Overview

Lumped-parameter thermal network solver exposed as a SaaS API. Users create projects containing thermal models (nodes, conductors, heat loads, boundary conditions, orbital config), run simulations, and retrieve time-history results. Pre-seeded material/coating database with ~50 common spacecraft materials.

## Tech Stack

- **Runtime:** Next.js 14+ App Router, TypeScript strict mode
- **Database:** Neon serverless Postgres + Drizzle ORM
- **Auth:** NextAuth.js (credentials + OAuth providers)
- **Solver:** Custom TypeScript — RK4 transient, Newton-Raphson steady-state
- **Math:** math.js for matrix operations in Newton-Raphson
- **Validation:** Zod for all API input validation

## Database Schema

### Tables

#### `users`
Standard NextAuth users table.
- `id` (uuid, PK)
- `name` (text)
- `email` (text, unique)
- `emailVerified` (timestamp)
- `image` (text)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

#### `accounts` / `sessions` / `verification_tokens`
Standard NextAuth tables.

#### `projects`
- `id` (uuid, PK)
- `userId` (uuid, FK → users)
- `name` (text)
- `description` (text)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

#### `thermal_models`
- `id` (uuid, PK)
- `projectId` (uuid, FK → projects)
- `name` (text)
- `description` (text)
- `orbitalConfig` (jsonb, nullable) — altitude, inclination, RAAN, epoch
- `version` (integer, default 1)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

#### `model_snapshots`
Simple version history — store full JSON snapshots.
- `id` (uuid, PK)
- `modelId` (uuid, FK → thermal_models)
- `version` (integer)
- `snapshot` (jsonb) — full model state
- `createdAt` (timestamp)

#### `thermal_nodes`
- `id` (uuid, PK)
- `modelId` (uuid, FK → thermal_models)
- `name` (text)
- `nodeType` (enum: 'diffusion' | 'arithmetic' | 'boundary')
- `temperature` (double) — initial temperature (K)
- `capacitance` (double, nullable) — C = m * c_p (J/K), required for diffusion
- `boundaryTemp` (double, nullable) — fixed temp for boundary nodes
- `materialId` (uuid, FK → materials, nullable)
- `area` (double, nullable) — surface area for radiation/environment (m²)
- `mass` (double, nullable) — mass in kg
- `absorptivity` (double, nullable) — solar absorptivity override
- `emissivity` (double, nullable) — IR emissivity override
- `createdAt` (timestamp)

#### `conductors`
- `id` (uuid, PK)
- `modelId` (uuid, FK → thermal_models)
- `name` (text)
- `conductorType` (enum: 'linear' | 'radiation' | 'contact')
- `nodeFromId` (uuid, FK → thermal_nodes)
- `nodeToId` (uuid, FK → thermal_nodes)
- `conductance` (double, nullable) — G in W/K for linear/contact
- `area` (double, nullable) — radiation area (m²)
- `viewFactor` (double, nullable) — F for radiation
- `emissivity` (double, nullable) — effective emissivity for radiation
- `createdAt` (timestamp)

#### `heat_loads`
- `id` (uuid, PK)
- `modelId` (uuid, FK → thermal_models)
- `nodeId` (uuid, FK → thermal_nodes)
- `name` (text)
- `loadType` (enum: 'constant' | 'time_varying' | 'orbital')
- `value` (double, nullable) — W, for constant loads
- `timeValues` (jsonb, nullable) — [[t, Q], ...] for piecewise linear
- `orbitalParams` (jsonb, nullable) — config for auto-calculated orbital loads
- `createdAt` (timestamp)

#### `materials`
- `id` (uuid, PK)
- `name` (text)
- `category` (enum: 'metal' | 'composite' | 'mli' | 'paint' | 'osr' | 'adhesive')
- `absorptivity` (double) — α_s
- `emissivity` (double) — ε_IR
- `conductivity` (double) — W/(m·K)
- `specificHeat` (double) — J/(kg·K)
- `density` (double) — kg/m³
- `tempRangeMin` (double) — K
- `tempRangeMax` (double) — K
- `isDefault` (boolean) — true for pre-seeded, false for user-created
- `userId` (uuid, FK → users, nullable) — null for default materials
- `projectId` (uuid, FK → projects, nullable) — scope custom materials to project
- `createdAt` (timestamp)

#### `simulation_runs`
- `id` (uuid, PK)
- `modelId` (uuid, FK → thermal_models)
- `status` (enum: 'pending' | 'running' | 'completed' | 'failed')
- `simulationType` (enum: 'transient' | 'steady_state')
- `config` (jsonb) — timeStart, timeEnd, timeStep, maxIterations, tolerance, etc.
- `startedAt` (timestamp, nullable)
- `completedAt` (timestamp, nullable)
- `errorMessage` (text, nullable)
- `energyBalanceError` (double, nullable) — final energy balance check
- `createdAt` (timestamp)

#### `simulation_results`
- `id` (uuid, PK)
- `runId` (uuid, FK → simulation_runs)
- `nodeId` (uuid, FK → thermal_nodes)
- `timeValues` (jsonb) — [[t, T], ...] temperature time history
- `conductorFlows` (jsonb, nullable) — heat flow data

### Indexes
- `projects.userId`
- `thermal_models.projectId`
- `thermal_nodes.modelId`
- `conductors.modelId`
- `heat_loads.modelId`
- `simulation_runs.modelId`
- `simulation_results.runId`
- `materials.isDefault`
- `materials.userId`

## API Design

All routes under `/api/`. Use Route Handlers (App Router). Zod validation on all inputs. NextAuth session check on all protected routes.

### Auth
- `GET/POST /api/auth/[...nextauth]` — NextAuth catch-all

### Projects
- `GET    /api/projects` — list user's projects
- `POST   /api/projects` — create project
- `GET    /api/projects/[id]` — get project detail
- `PUT    /api/projects/[id]` — update project
- `DELETE /api/projects/[id]` — delete project

### Thermal Models
- `GET    /api/projects/[id]/models` — list models
- `POST   /api/projects/[id]/models` — create model
- `GET    /api/projects/[id]/models/[mid]` — get model with all children
- `PUT    /api/projects/[id]/models/[mid]` — update model
- `DELETE /api/projects/[id]/models/[mid]` — delete model

### Nodes
- `GET    /api/projects/[id]/models/[mid]/nodes` — list nodes
- `POST   /api/projects/[id]/models/[mid]/nodes` — create node
- `PUT    /api/projects/[id]/models/[mid]/nodes/[nid]` — update node
- `DELETE /api/projects/[id]/models/[mid]/nodes/[nid]` — delete node

### Conductors
- `GET    /api/projects/[id]/models/[mid]/conductors` — list conductors
- `POST   /api/projects/[id]/models/[mid]/conductors` — create conductor
- `PUT    /api/projects/[id]/models/[mid]/conductors/[cid]` — update
- `DELETE /api/projects/[id]/models/[mid]/conductors/[cid]` — delete

### Heat Loads
- `GET    /api/projects/[id]/models/[mid]/heat-loads` — list
- `POST   /api/projects/[id]/models/[mid]/heat-loads` — create
- `PUT    /api/projects/[id]/models/[mid]/heat-loads/[hid]` — update
- `DELETE /api/projects/[id]/models/[mid]/heat-loads/[hid]` — delete

### Simulation
- `POST   /api/projects/[id]/models/[mid]/simulate` — run simulation
- `GET    /api/projects/[id]/models/[mid]/results` — get results
- `GET    /api/projects/[id]/models/[mid]/results/[rid]` — specific run
- `GET    /api/projects/[id]/models/[mid]/results/[rid]/export` — CSV/JSON export

### Materials
- `GET    /api/materials` — list default + user's custom
- `POST   /api/materials` — create custom material
- `PUT    /api/materials/[mid]` — update custom material
- `DELETE /api/materials/[mid]` — delete custom material

### Orbital Environment
- `POST   /api/orbital-env` — calculate orbital environment given params

## Solver Architecture

### Core Engine (`lib/solver/`)

#### `thermal-network.ts`
Builds the thermal network from model data. Creates adjacency lists for nodes/conductors.

#### `rk4-solver.ts`
4th-order Runge-Kutta with adaptive step sizing (RK45 embedded pair for error estimation).
- Computes dT/dt for each diffusion node
- Handles arithmetic nodes (solve equilibrium at each step)
- Boundary nodes remain fixed
- Adaptive step: compare RK4 vs RK5 solution, adjust dt to keep local error below tolerance

#### `steady-state-solver.ts`
Newton-Raphson for steady-state:
- Set dT/dt = 0 for all nodes
- Construct residual vector F(T) and Jacobian J(T)
- Solve J * δT = -F using math.js matrix operations
- Iterate until ||F|| < tolerance

#### `heat-flow.ts`
Computes:
- Linear conduction: Q = G * (T_j - T_i)
- Radiation: Q = σ * ε * A * F * (T_j⁴ - T_i⁴)
- Contact: Q = G_contact * (T_j - T_i)
- External heat loads (constant, interpolated time-varying, orbital)

#### `orbital-environment.ts`
Computes orbital thermal environment:
- Orbital period: T = 2π * sqrt((R_e + h)³ / μ)
- Beta angle: β = arcsin(cos(δ_sun)*sin(i)*sin(Ω - α_sun) + sin(δ_sun)*cos(i))
- Eclipse fraction from cylindrical shadow model
- Solar flux with seasonal variation
- Earth albedo and IR with view factors
- Generates time-varying heat load profile over orbit

#### `energy-balance.ts`
Post-simulation check: sum of all heat flows into/out of system should equal net energy change.

### Solver Data Flow

```
Model Data (DB) → Build Network → Choose Solver
                                    ├─ Transient → RK4 → Results
                                    └─ Steady-State → Newton-Raphson → Results
```

Each solver returns: `{ nodeTemperatures: Map<nodeId, number[]>, timePoints: number[], conductorFlows: Map<conductorId, number[]>, energyBalance: number }`

## Orbital Environment Module

### Inputs
- `altitude`: km (LEO: 200-2000 km)
- `inclination`: degrees (0-180)
- `raan`: degrees (0-360) — Right Ascension of Ascending Node
- `epoch`: ISO date string — for sun position calculation

### Outputs
- `orbitalPeriod`: seconds
- `betaAngle`: degrees
- `eclipseFraction`: 0-1
- `solarFlux`: W/m² (with seasonal correction)
- `albedoFlux`: W/m² (peak, varies with sun angle)
- `earthIR`: W/m²
- `earthViewFactor`: 0-1
- `sunlitProfile`: time-varying boolean over one orbit
- `heatLoadProfile`: time-varying environmental heat loads

### Constants
- Earth radius: 6371 km
- Gravitational parameter μ: 3.986004418e14 m³/s²
- Solar constant S₀: 1361 W/m²
- Earth albedo coefficient: 0.3
- Earth IR average: 237 W/m²
- Stefan-Boltzmann σ: 5.670374419e-8 W/(m²·K⁴)
- Sun ecliptic longitude: approximate from epoch date

## Material Database

~50 pre-seeded materials across categories:
- **Metals** (~12): Al 6061-T6, Al 7075, Ti-6Al-4V, SS 304, SS 316, Invar 36, Copper C101, Beryllium, Magnesium AZ31, Kovar, Inconel 718, Molybdenum
- **Composites** (~6): CFRP (quasi-iso), CFRP (unidirectional), GFRP, Kevlar/Epoxy, Honeycomb Al, Honeycomb CFRP
- **MLI Blankets** (~6): MLI (10-layer), MLI (15-layer), MLI (20-layer), Single-layer Kapton, Single-layer Mylar, Beta cloth
- **Paints/Coatings** (~12): Aeroglaze Z306 (black), Aeroglaze Z307 (black), Aeroglaze A276 (white), MAP PUK (white), Chemglaze A971 (black), ITO coating, Alodine, Anodized Al (black), Anodized Al (clear), Gold coating, Silver Teflon, Germanium black Kapton
- **OSRs** (~6): OSR (silvered Teflon), OSR (aluminized Teflon), Second-surface mirror, Silvered quartz, Z-93 white paint, S13G/LO-1 white paint
- **Adhesives** (~4): EA 9394, Hysol EA 956, RTV 566, Cho-Therm 1671

All values from published NASA/ESA thermal engineering handbooks.

## Security Considerations

- All API routes check NextAuth session (except materials GET for defaults)
- Users can only access their own projects (userId filter on all queries)
- Zod validation prevents injection via malformed input
- Parameterized queries via Drizzle ORM (no raw SQL)
- Rate limiting on simulation endpoint (compute-intensive)
- Simulation timeout to prevent runaway computations

## Directory Structure

```
/src
  /app
    /api
      /auth/[...nextauth]/route.ts
      /projects/route.ts
      /projects/[id]/route.ts
      /projects/[id]/models/route.ts
      /projects/[id]/models/[mid]/route.ts
      /projects/[id]/models/[mid]/nodes/route.ts
      /projects/[id]/models/[mid]/nodes/[nid]/route.ts
      /projects/[id]/models/[mid]/conductors/route.ts
      /projects/[id]/models/[mid]/conductors/[cid]/route.ts
      /projects/[id]/models/[mid]/heat-loads/route.ts
      /projects/[id]/models/[mid]/heat-loads/[hid]/route.ts
      /projects/[id]/models/[mid]/simulate/route.ts
      /projects/[id]/models/[mid]/results/route.ts
      /projects/[id]/models/[mid]/results/[rid]/route.ts
      /projects/[id]/models/[mid]/results/[rid]/export/route.ts
      /materials/route.ts
      /materials/[mid]/route.ts
      /orbital-env/route.ts
    layout.tsx
    page.tsx
  /lib
    /db
      client.ts
      schema.ts
      relations.ts
    /solver
      thermal-network.ts
      rk4-solver.ts
      steady-state-solver.ts
      heat-flow.ts
      orbital-environment.ts
      energy-balance.ts
      types.ts
    /auth
      options.ts
    /validators
      projects.ts
      models.ts
      nodes.ts
      conductors.ts
      heat-loads.ts
      materials.ts
      simulation.ts
      orbital.ts
    /utils
      api-helpers.ts
  /scripts
    seed-materials.ts
    test-solver.ts
  /drizzle
    (migrations)
drizzle.config.ts
next.config.ts
tsconfig.json
package.json
.env.example
```
