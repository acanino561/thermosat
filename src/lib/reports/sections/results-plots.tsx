import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

interface TimeSliceData {
  name: string;
  firstTemp: number;
  midTemp: number;
  finalTemp: number;
}

interface ResultsPlotsProps {
  timeSlices: TimeSliceData[];
  timeStart: number;
  timeMid: number;
  timeEnd: number;
}

const W = ['25%', '25%', '25%', '25%'];

export function ResultsPlots({ timeSlices, timeStart, timeMid, timeEnd }: ResultsPlotsProps) {
  return (
    <View>
      <Text style={styles.sectionTitle}>5. Results — Temperature Profiles</Text>
      <Text style={styles.bodyText}>
        Temperature values at three time snapshots: start ({timeStart.toFixed(0)} s),
        mid ({timeMid.toFixed(0)} s), and end ({timeEnd.toFixed(0)} s).
      </Text>
      <View style={styles.tableHeader}>
        {['Node', `T @ ${timeStart.toFixed(0)}s (K)`, `T @ ${timeMid.toFixed(0)}s (K)`, `T @ ${timeEnd.toFixed(0)}s (K)`].map((h, i) => (
          <Text key={h} style={[styles.tableHeaderCell, { width: W[i] }]}>{h}</Text>
        ))}
      </View>
      {timeSlices.map((n, i) => (
        <View key={n.name + i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={[styles.tableCell, { width: W[0] }]}>{n.name}</Text>
          <Text style={[styles.tableCell, { width: W[1] }]}>{n.firstTemp.toFixed(2)}</Text>
          <Text style={[styles.tableCell, { width: W[2] }]}>{n.midTemp.toFixed(2)}</Text>
          <Text style={[styles.tableCell, { width: W[3] }]}>{n.finalTemp.toFixed(2)}</Text>
        </View>
      ))}
    </View>
  );
}
