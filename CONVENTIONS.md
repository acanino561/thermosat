# Verixos Codebase Conventions

Quick reference for agents working on this codebase. Read this BEFORE scanning files.

## Stack
- **Framework:** Next.js 14, App Router
- **Language:** TypeScript (strict)
- **UI:** shadcn/ui + Tailwind CSS + Framer Motion
- **3D:** React Three Fiber (Three.js)
- **Charts:** Recharts
- **State:** Zustand (stores in `src/lib/stores/`)
- **DB:** Neon Postgres + Drizzle ORM
- **Auth:** NextAuth.js
- **Package manager:** pnpm ONLY (never npm/yarn)
- **Deployment:** Vercel

## File Structure
```
src/
├── app/
│   ├── (auth)/          # Auth pages (login, signup, verify-email, reset-password)
│   ├── api/             # API routes (RESTful, Next.js route handlers)
│   ├── dashboard/       # Authenticated app pages
│   ├── demo/            # Public demo page
│   └── page.tsx         # Landing page
├── components/
│   ├── auth/            # Auth UI components
│   ├── dashboard/       # Dashboard components (cards, sidebar, dialogs)
│   ├── editor/          # Thermal model editor (toolbar, panels, dialogs, viewport)
│   ├── landing/         # Landing page sections
│   ├── results/         # Simulation results (charts, tables, export)
│   ├── shared/          # Shared UI utilities (cursor-glow, grain-overlay, logo)
│   ├── three/           # Three.js specific components (cubesat-model)
│   └── ui/              # shadcn/ui primitives (button, dialog, input, etc.)
├── lib/
│   ├── auth/            # Auth utilities (rate-limit)
│   ├── db/              # Database (schema.ts, index.ts)
│   ├── solver/          # Thermal solver engine (rk4, steady-state, orbital-env)
│   ├── stores/          # Zustand stores (editor-store)
│   └── validators/      # Zod schemas (materials)
└── scripts/             # CLI scripts (seed-materials, test-solver)
```

## Patterns

### API Routes
- RESTful: `src/app/api/[resource]/route.ts` exports GET, POST, PUT, DELETE
- Nested resources: `/api/projects/[id]/models/[mid]/nodes/[nid]`
- Input validation: Zod schemas
- Response format: `NextResponse.json({ data })` or `NextResponse.json({ error }, { status })`
- Auth check: `getServerSession(authOptions)` at top of protected routes

### Database
- Schema: `src/lib/db/schema.ts` (single file, all tables)
- Migrations: `drizzle/` directory, generated via `drizzle-kit`
- Connection: `src/lib/db/index.ts` exports `db` instance
- Queries: Drizzle query builder (NOT raw SQL)

### Components
- Functional components, arrow function style
- Props interfaces defined inline or in same file
- shadcn/ui for all UI primitives (Button, Dialog, Input, Select, etc.)
- Tailwind for styling (no CSS modules, no styled-components)
- Framer Motion for animations (`motion.div`)

### State Management
- Zustand stores with `create` from 'zustand'
- Stores in `src/lib/stores/`
- Editor store manages: nodes, conductors, heatLoads, selectedNode, simulation state
- Undo/redo built into editor store (history stack with action descriptions)

### Naming
- Files: kebab-case (`add-node-dialog.tsx`)
- Components: PascalCase (`AddNodeDialog`)
- Functions/variables: camelCase
- DB columns: snake_case (Drizzle maps to camelCase in TS)
- API routes: kebab-case paths

### Environment Variables
- See `.env.example` for required vars
- Database: `DATABASE_URL`
- Auth: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`
- Email: `RESEND_API_KEY`
