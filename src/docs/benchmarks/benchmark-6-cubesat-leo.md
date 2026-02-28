# Benchmark 6: Simple Satellite Box, LEO

## Reference
Published passive CubeSat temperature range: -40°C to +60°C (233K to 333K).

## Setup
- 6-node CubeSat: ±X/±Y/±Z faces, each 0.01m²
- Aluminum: α=0.2, ε=0.8, C=50 J/K per face
- View factor to space: 0.85, inter-face conduction: 2.0 W/K
- Orbit: 400km, 51.6° inclination, ~92.4min period
- Orbital heat loads: solar, albedo, Earth IR
- 3 orbital periods, check last orbit for steady-periodic behavior

## Results
| Face | Min T (°C) | Max T (°C) | Within Range |
|------|-----------|-----------|--------------|
| +X   | -7.7      | 43.8      | ✅ |
| -X   | -7.7      | 43.8      | ✅ |
| +Y   | -7.7      | 43.8      | ✅ |
| -Y   | -7.7      | 43.8      | ✅ |
| +Z   | -7.8      | 43.6      | ✅ |
| -Z   | -7.9      | 43.6      | ✅ |

## Pass Criterion
All nodes within published range ±10% bounds (223K to 343K). **PASSED**
