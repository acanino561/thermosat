# Benchmark 8: Two-Node Conduction (Precise)

## Reference
Analytical steady-state: T1 = T2 + Q/G

## Setup
- Node 1: diffusion, Q=100W heat load
- Node 2: boundary at 200K
- Linear conductor G=10 W/K

## Analytical Solution
T1 = 200 + 100/10 = **210.0 K**

## Results
| Quantity | Analytical | Solver | Error |
|----------|-----------|--------|-------|
| T1       | 210.000 K | 210.000 K | 0.000000% |

## Pass Criterion
Within 0.1% of analytical. **PASSED**
