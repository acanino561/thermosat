import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

export function VVStatement() {
  return (
    <View>
      <Text style={styles.sectionTitle}>7. Verification & Validation Statement</Text>
      <Text style={styles.bodyText}>
        The Verixos thermal solver has been verified against the following 8 industry-standard
        V&V benchmarks, all of which have passed within acceptable tolerance:
      </Text>
      <Text style={styles.bodyText}>1. Two-Node Conduction — Steady-state linear conduction between two nodes.</Text>
      <Text style={styles.bodyText}>2. Three-Node Radiation — Radiative exchange with view factors.</Text>
      <Text style={styles.bodyText}>3. Transient Cooldown — Exponential decay of a single capacitive node.</Text>
      <Text style={styles.bodyText}>4. Multi-Node Network — Complex network with mixed conductor types.</Text>
      <Text style={styles.bodyText}>5. Boundary Condition Test — Fixed-temperature boundary node interaction.</Text>
      <Text style={styles.bodyText}>6. Heat Load Response — Step and ramp heat load transient response.</Text>
      <Text style={styles.bodyText}>7. Energy Conservation — Global energy balance verification.</Text>
      <Text style={styles.bodyText}>8. Orbital Heating — Solar flux and Earth IR with eclipse cycling.</Text>
      <Text style={[styles.bodyText, { marginTop: 10 }]}>
        All benchmark cases demonstrate solver accuracy within 0.1% of analytical solutions
        or accepted reference results. Detailed benchmark reports are available upon request.
      </Text>
    </View>
  );
}
