import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

interface MaterialInfo {
  name: string;
  category: string;
  conductivity: number;
  specificHeat: number;
  density: number;
  absorptivity: number;
  emissivity: number;
}

interface AppendixProps {
  materials: MaterialInfo[];
  modelParamsJson: string;
}

const W = ['18%', '12%', '14%', '14%', '14%', '14%', '14%'];

export function Appendix({ materials, modelParamsJson }: AppendixProps) {
  return (
    <View>
      <Text style={styles.sectionTitle}>8. Appendix</Text>

      {materials.length > 0 && (
        <View>
          <Text style={styles.subsectionTitle}>Material Properties</Text>
          <View style={styles.tableHeader}>
            {['Name', 'Category', 'k (W/mK)', 'Cp (J/kgK)', 'ρ (kg/m³)', 'αs', 'εIR'].map((h, i) => (
              <Text key={h} style={[styles.tableHeaderCell, { width: W[i] }]}>{h}</Text>
            ))}
          </View>
          {materials.map((m, i) => (
            <View key={m.name + i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { width: W[0] }]}>{m.name}</Text>
              <Text style={[styles.tableCell, { width: W[1] }]}>{m.category}</Text>
              <Text style={[styles.tableCell, { width: W[2] }]}>{m.conductivity.toFixed(2)}</Text>
              <Text style={[styles.tableCell, { width: W[3] }]}>{m.specificHeat.toFixed(0)}</Text>
              <Text style={[styles.tableCell, { width: W[4] }]}>{m.density.toFixed(0)}</Text>
              <Text style={[styles.tableCell, { width: W[5] }]}>{m.absorptivity.toFixed(3)}</Text>
              <Text style={[styles.tableCell, { width: W[6] }]}>{m.emissivity.toFixed(3)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.subsectionTitle}>Model Parameters</Text>
      <Text style={[styles.bodyText, { fontSize: 7, fontFamily: 'Courier' }]}>
        {modelParamsJson}
      </Text>
    </View>
  );
}
