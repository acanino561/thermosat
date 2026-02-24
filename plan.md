# Spacecraft Thermal Analysis SaaS — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete backend for spacecraft thermal analysis SaaS MVP with solver engine, API layer, material database, and orbital environment calculator.

**Architecture:** Next.js 14+ App Router with TypeScript strict mode. Neon Postgres + Drizzle ORM. Custom thermal solver (RK4 transient, Newton-Raphson steady-state). RESTful API with Zod validation.

**Tech Stack:** Next.js, TypeScript, Drizzle ORM, Neon Postgres, NextAuth.js, Zod, math.js

---

### Task 1: Project Scaffold
- `package.json`, `tsconfig.json`, `next.config.ts`, `.env.example`, `drizzle.config.ts`
- Install all dependencies
- Git init + initial commit

### Task 2: Database Schema (`src/lib/db/schema.ts`)
- All tables: users, accounts, sessions, projects, thermal_models, model_snapshots, thermal_nodes, conductors, heat_loads, materials, simulation_runs, simulation_results

### Task 3: Database Relations (`src/lib/db/relations.ts`)
- Drizzle relations for all tables

### Task 4: Database Client (`src/lib/db/client.ts`)
- Neon serverless connection + Drizzle instance

### Task 5: Auth Configuration (`src/lib/auth/options.ts` + route)
- NextAuth.js with Drizzle adapter

### Task 6: Zod Validators (`src/lib/validators/*.ts`)
- All input validators for every API endpoint

### Task 7: API Helpers (`src/lib/utils/api-helpers.ts`)
- Auth check, error responses, ownership verification

### Task 8: Solver Types (`src/lib/solver/types.ts`)
- All TypeScript interfaces for solver engine

### Task 9: Heat Flow Calculator (`src/lib/solver/heat-flow.ts`)
- Linear conduction, radiation, contact conductance

### Task 10: Orbital Environment (`src/lib/solver/orbital-environment.ts`)
- Full orbital environment calculator

### Task 11: RK4 Solver (`src/lib/solver/rk4-solver.ts`)
- Adaptive RK45 transient solver

### Task 12: Steady-State Solver (`src/lib/solver/steady-state-solver.ts`)
- Newton-Raphson steady-state solver

### Task 13: Thermal Network Builder (`src/lib/solver/thermal-network.ts`)
- Convert DB model to solver data structures

### Task 14: Energy Balance Checker (`src/lib/solver/energy-balance.ts`)
- Post-simulation energy balance verification

### Task 15: Projects API (`src/app/api/projects/`)
- CRUD routes

### Task 16: Models API (`src/app/api/projects/[id]/models/`)
- CRUD routes

### Task 17: Nodes API
- CRUD routes

### Task 18: Conductors API
- CRUD routes

### Task 19: Heat Loads API
- CRUD routes

### Task 20: Materials API
- GET defaults + CRUD custom

### Task 21: Simulation API
- POST simulate + GET results + export

### Task 22: Orbital Environment API
- POST calculate

### Task 23: Material Seed Script
- ~50 real spacecraft materials

### Task 24: Solver Test Script
- 2-node conduction validation against analytical solution

### Task 25: App Layout + Migrations
- Root layout, drizzle migration generation, build verification

---

File-by-file details are embedded in each task during Phase 3 execution.
