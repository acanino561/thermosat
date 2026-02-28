import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

interface HeatPathEntry {
  conductorName: string;
  fromNode: string;
  toNode: string;
  avgFlow: number;
  maxFlow: number;
}

interface HeatFlowSummaryProps {
  heatPaths: HeatPathEntry[];
  energyBalanceError: number | null;
}

const W = ['25%', '18%', '18%', '20%', '19%'];

export function HeatFlowSummary({ heatPaths, energyBalanceError }: HeatFlowSummaryProps) {
  const top5 = [...heatPaths]
    .sort((a, b) => Math.abs(b.maxFlow) - Math.abs(a.maxFlow))
    .slice(0, 5);

  return (
    <View>
      <Text style={styles.sectionTitle}>6. Results — Heat Flow Summary</Text>

      {energyBalanceError != null && (
        <Text style={styles.bodyText}>
          Energy Balance Error: {(energyBalanceError * 100).toFixed(4)}%
        </Text>
      )}

      <Text style={styles.subsectionTitle}>Top 5 Dominant Heat Paths</Text>
      <View style={styles.tableHeader}>
        {['Conductor', 'From', 'To', 'Avg Flow (W)', 'Max Flow (W)'].map((h, i) => (
          <Text key={h} style={[styles.tableHeaderCell, { width: W[i] }]}>{h}</Text>
        ))}
      </View>
      {top5.map((p, i) => (
        <View key={p.conductorName + i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={[styles.tableCell, { width: W[0] }]}>{p.conductorName}</Text>
          <Text style={[styles.tableCell, { width: W[1] }]}>{p.fromNode}</Text>
          <Text style={[styles.tableCell, { width: W[2] }]}>{p.toNode}</Text>
          <Text style={[styles.tableCell, { width: W[3] }]}>{p.avgFlow.toFixed(3)}</Text>
          <Text style={[styles.tableCell, { width: W[4] }]}>{p.maxFlow.toFixed(3)}</Text>
        </View>
      ))}

      {heatPaths.length === 0 && (
        <Text style={styles.bodyText}>No conductor flow data available for this simulation.</Text>
      )}
    </View>
  );
}
