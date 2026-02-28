# Benchmark 4: Multi-Node Radiation Enclosure

## Reference
Gebhart method for 3-surface diffuse-gray enclosure.

## Setup
- 3 surfaces: A1=1m², A2=1m², A3=2m²
- Emissivities: ε1=0.8, ε2=0.6, ε3=0.9
- T1=500K (boundary), T2=300K (boundary), A3 free-floating
- View factors: F12=0.2, F13=0.4, F23=0.4
- Effective emissivities: ε_eff = 1/(1/ε_i + 1/ε_j - 1)

## Analytical Solution
Energy balance on node 3 (net heat = 0):

```
ε13_eff * A1 * F13 * (T1⁴ - T3⁴) + ε23_eff * A2 * F23 * (T2⁴ - T3⁴) = 0
T3 = 444.14 K
Q1→3 = 393.09 W
Q2→3 = -393.09 W
```

## Results
| Quantity | Analytical | Solver | Error |
|----------|-----------|--------|-------|
| T3       | 444.14 K  | 444.14 K | 0.00% |
| Q1→3     | 393.09 W  | 393.09 W | 0.00% |
| Q2→3     | -393.09 W | -393.09 W | 0.00% |

## Pass Criterion
All values within 5% of analytical. **PASSED**
