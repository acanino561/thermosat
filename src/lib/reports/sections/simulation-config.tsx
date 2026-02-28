import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { SimulationConfigData } from '@/lib/db/schema';

interface SimulationConfigProps {
  simulationType: string;
  config: SimulationConfigData;
}

export function SimulationConfig({ simulationType, config }: SimulationConfigProps) {
  return (
    <View>
      <Text style={styles.sectionTitle}>3. Simulation Configuration</Text>
      <Text style={styles.bodyText}>Simulation Type: {simulationType === 'transient' ? 'Transient (RK4)' : 'Steady State (Implicit Euler)'}</Text>
      <Text style={styles.bodyText}>Time Start: {config.timeStart} s</Text>
      <Text style={styles.bodyText}>Time End: {config.timeEnd} s</Text>
      <Text style={styles.bodyText}>Time Step: {config.timeStep} s</Text>
      <Text style={styles.bodyText}>Max Iterations: {config.maxIterations}</Text>
      <Text style={styles.bodyText}>Tolerance: {config.tolerance}</Text>
      {config.minStep != null && <Text style={styles.bodyText}>Min Step: {config.minStep} s</Text>}
      {config.maxStep != null && <Text style={styles.bodyText}>Max Step: {config.maxStep} s</Text>}
      {config.outputInterval != null && <Text style={styles.bodyText}>Output Interval: {config.outputInterval} s</Text>}
    </View>
  );
}
