import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { styles, BRAND } from '../styles';

const s = StyleSheet.create({
  card: {
    backgroundColor: BRAND.gray50,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.primary,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statLabel: { fontSize: 9, color: BRAND.gray600 },
  statValue: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  pass: { color: BRAND.green },
  fail: { color: BRAND.red },
  warn: { color: BRAND.amber },
});

interface NodeSummary {
  name: string;
  minTemp: number;
  maxTemp: number;
  avgTemp: number;
}

interface ExecutiveSummaryProps {
  nodeSummaries: NodeSummary[];
  simulationType: string;
}

export function ExecutiveSummary({ nodeSummaries, simulationType }: ExecutiveSummaryProps) {
  if (nodeSummaries.length === 0) {
    return (
      <View>
        <Text style={styles.sectionTitle}>1. Executive Summary</Text>
        <Text style={styles.bodyText}>No simulation results available.</Text>
      </View>
    );
  }

  const hottest = nodeSummaries.reduce((a, b) => a.maxTemp > b.maxTemp ? a : b);
  const coldest = nodeSummaries.reduce((a, b) => a.minTemp < b.minTemp ? a : b);

  return (
    <View>
      <Text style={styles.sectionTitle}>1. Executive Summary</Text>
      <Text style={styles.bodyText}>
        This report presents the thermal analysis results for a {simulationType} simulation.
        The model contains {nodeSummaries.length} thermal node{nodeSummaries.length > 1 ? 's' : ''}.
      </Text>
      <View style={s.card}>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Hottest Node</Text>
          <Text style={s.statValue}>{hottest.name}: {hottest.maxTemp.toFixed(2)} K</Text>
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Coldest Node</Text>
          <Text style={s.statValue}>{coldest.name}: {coldest.minTemp.toFixed(2)} K</Text>
        </View>
        <View style={s.statRow}>
          <Text style={s.statLabel}>Temperature Range</Text>
          <Text style={s.statValue}>{coldest.minTemp.toFixed(2)} K — {hottest.maxTemp.toFixed(2)} K</Text>
        </View>
      </View>
    </View>
  );
}
