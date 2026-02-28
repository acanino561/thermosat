import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

interface NodeResult {
  name: string;
  minTemp: number;
  maxTemp: number;
  avgTemp: number;
  initialTemp: number;
  finalTemp: number;
}

interface ResultsTemperatureProps {
  nodeResults: NodeResult[];
}

const W = ['20%', '14%', '14%', '14%', '14%', '14%', '10%'];

function statusIcon(min: number, max: number): string {
  // General spacecraft thermal limits heuristic
  if (min < 173 || max > 373) return 'FAIL';
  if (min < 233 || max > 343) return 'WARN';
  return 'PASS';
}

export function ResultsTemperature({ nodeResults }: ResultsTemperatureProps) {
  return (
    <View>
      <Text style={styles.sectionTitle}>4. Results — Temperature Summary</Text>
      <View style={styles.tableHeader}>
        {['Node', 'Min (K)', 'Max (K)', 'Avg (K)', 'Initial (K)', 'Final (K)', 'Status'].map((h, i) => (
          <Text key={h} style={[styles.tableHeaderCell, { width: W[i] }]}>{h}</Text>
        ))}
      </View>
      {nodeResults.map((n, i) => {
        const status = statusIcon(n.minTemp, n.maxTemp);
        return (
          <View key={n.name + i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={[styles.tableCell, { width: W[0] }]}>{n.name}</Text>
            <Text style={[styles.tableCell, { width: W[1] }]}>{n.minTemp.toFixed(2)}</Text>
            <Text style={[styles.tableCell, { width: W[2] }]}>{n.maxTemp.toFixed(2)}</Text>
            <Text style={[styles.tableCell, { width: W[3] }]}>{n.avgTemp.toFixed(2)}</Text>
            <Text style={[styles.tableCell, { width: W[4] }]}>{n.initialTemp.toFixed(2)}</Text>
            <Text style={[styles.tableCell, { width: W[5] }]}>{n.finalTemp.toFixed(2)}</Text>
            <Text style={[styles.tableCell, { width: W[6] }]}>{status}</Text>
          </View>
        );
      })}
    </View>
  );
}
