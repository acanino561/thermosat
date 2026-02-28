# Benchmark 7: Deployed Solar Array

## Reference
Analytical steady-state for flat plate radiating to deep space with constant solar input.

## Setup
- Single node: A=0.5m², GaAs (α=0.92, ε=0.85), C=200 J/K
- Q_absorbed = 1367 × 0.92 × 0.5 = 628.82 W
- Radiation to 0K (deep space)
- T_eq = (Q / (σ × ε × A))^0.25

## Analytical Solution
T_eq = (628.82 / (5.67e-8 × 0.85 × 0.5))^0.25 = **401.91 K**

## Results
| Quantity | Analytical | Solver | Error |
|----------|-----------|--------|-------|
| T_eq     | 401.91 K  | 401.91 K | 0.0000% |

## Pass Criterion
Within 1% of analytical. **PASSED**
