# Verixos V&V Benchmarks

All 10 benchmarks validate the Verixos thermal solver against analytical solutions.
Run with: `pnpm test:benchmarks`

---

## Benchmark 1 — Two-Node Conduction
**Type:** Conductive heat transfer  
**Reference:** Analytical: Q = G × ΔT → T₂ = T₁ - Q/G  
**Setup:** Two nodes, one conductor G = 1 W/K, Q = 10 W applied to node 1, node 2 fixed at 250 K  
**Acceptance:** < 1% relative error on steady-state temperatures  
**Status:** ✅ PASS

---

## Benchmark 2 — Single-Node Radiation to Space
**Type:** Radiation (Stefan-Boltzmann)  
**Reference:** Q = ε·σ·A·T⁴ equilibrium  
**Setup:** Single node, ε = 0.85, A = 0.01 m², Q_in = 10 W  
**Acceptance:** < 0.1% relative error on equilibrium temperature  
**Status:** ✅ PASS

---

## Benchmark 3 — Orbital Environment (ISS LEO)
**Type:** Orbital environment calculation  
**Reference:** ISS orbit parameters: 400 km altitude, 51.6° inclination  
**Setup:** Orbital period, eclipse fraction, solar flux, albedo, OLR  
**Acceptance:** Period within 1% of analytical, eclipse fraction within 5%, flux within 2%  
**Status:** ✅ PASS

---

## Benchmark 4 — Multi-Node Conduction Network
**Type:** Conductive network  
**Reference:** Analytical resistor network solution  
**Setup:** 5-node network with mixed conductor values  
**Acceptance:** All node temperatures within 0.1 K of analytical  
**Status:** ✅ PASS

---

## Benchmark 5 — Radiation Network
**Type:** Radiation network with view factors  
**Reference:** Analytical radiosity equations  
**Setup:** 3-surface enclosure with specified view factors  
**Acceptance:** Heat flux within 1% of analytical  
**Status:** ✅ PASS

---

## Benchmark 6 — Transient Response
**Type:** Transient thermal  
**Reference:** Analytical exponential decay T(t) = T_eq + (T₀ - T_eq)·e^(-t/τ)  
**Setup:** Single node, thermal time constant τ = C/G  
**Acceptance:** Temperature trace within 2% of analytical at all timesteps  
**Status:** ✅ PASS

---

## Benchmark 7 — Hot/Cold Case Orbital
**Type:** Combined orbital + thermal  
**Reference:** Conservative bounding analysis  
**Setup:** Hot case (max solar, no eclipse) and cold case (min solar, eclipse) with realistic CubeSat geometry  
**Acceptance:** Hot case > cold case, both within expected ranges  
**Status:** ✅ PASS

---

## Benchmark 8 — Material Properties Database
**Type:** Material property validation  
**Reference:** Published material data (NASA SP-8055, ECSS standards)  
**Setup:** Validate α_solar, ε_IR for 10 reference materials  
**Acceptance:** All values within published ranges  
**Status:** ✅ PASS

---

## Benchmark 9 — Heat Pipe Conductor
**Type:** Heat pipe (temperature-dependent conductance)  
**Reference:** Q = G_eff(T) × ΔT → ΔT = Q / G_eff at steady state  
**Setup:** 2-node model with piecewise-linear G_eff(T) curve:
- T < 280 K: G_eff = 0.5 W/K (startup)
- 280–320 K: G_eff = 5.0 W/K (operating range)
- T > 320 K: G_eff = 0.5 W/K (burnout)

Three operating points validated:
1. Cold (Q=2W, T_cold=270K): G_eff=0.5, expected ΔT=4.0K
2. Nominal (Q=10W, T_cold=290K): G_eff=5.0, expected ΔT=2.0K
3. Hot (Q=20W, T_cold=315K): interpolated G_eff

**Acceptance:** < 10% relative error at all 3 operating points  
**Status:** ✅ PASS

---

## Benchmark 10 — Monte Carlo View Factors
**Type:** Radiation view factor computation  
**Reference:** Analytical solutions from Incropera Table 13.1 and Hamilton & Morgan charts  
**Setup:** Three classic geometries with procedurally generated triangle meshes:

| Geometry | Analytical F₁₂ | 100K rays tolerance |
|----------|----------------|---------------------|
| Parallel coaxial disks (R/H=1) | 0.382 | < 5% |
| Perpendicular rectangles (W/H=1) | 0.200 | < 5% |
| Concentric spheres (inner→outer) | 1.000 | < 1% |

**Acceptance:** < 5% relative error at 100K rays; < 1% at 1M rays (documented)  
**Status:** ✅ PASS

---

## Running Benchmarks

```bash
# All 10 benchmarks
pnpm test:benchmarks

# Individual suites
pnpm test:solver          # Benchmarks 1-3
pnpm test:solver-v2       # Benchmarks 4-8
npx tsx src/__tests__/benchmarks/benchmark-09.test.ts  # Benchmark 9
npx tsx src/__tests__/benchmarks/benchmark-10.test.ts  # Benchmark 10
```
