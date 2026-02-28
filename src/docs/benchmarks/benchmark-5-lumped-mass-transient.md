# Benchmark 5: Lumped Mass Transient Response

## Reference
Analytical radiation cooling: dT/dt = -σεA/C × T⁴, solved with fine Euler (dt=0.01s) as truth.

## Setup
- Single node, C=500 J/K, ε=0.9, A=0.1m², T0=400K
- Radiation to 0K sink, no heat loads
- Simulation: 3600s

## Analytical Reference (fine Euler)
| Time (s) | T (K) |
|----------|-------|
| 900      | 285.03 |
| 1800     | 241.79 |
| 2700     | 216.68 |
| 3600     | 199.54 |

## Results
| Time (s) | Truth (K) | Solver (K) | Error |
|----------|-----------|-----------|-------|
| 900      | 285.03    | 286.33    | 0.454% |
| 1800     | 241.79    | 242.46    | 0.276% |
| 2700     | 216.68    | 217.11    | 0.198% |
| 3600     | 199.54    | 199.55    | 0.000% |

## Pass Criterion
All checkpoints within 2% error. **PASSED**
