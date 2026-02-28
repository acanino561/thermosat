import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { styles, BRAND } from '../styles';
import type { OrbitalConfig } from '@/lib/db/schema';

interface NodeInfo {
  name: string;
  nodeType: string;
  temperature: number;
  capacitance: number | null;
  mass: number | null;
  area: number | null;
}

interface ConductorInfo {
  name: string;
  conductorType: string;
  nodeFromName: string;
  nodeToName: string;
  conductance: number | null;
  viewFactor: number | null;
}

interface ModelDescriptionProps {
  nodes: NodeInfo[];
  conductorList: ConductorInfo[];
  orbitalConfig: OrbitalConfig | null;
}

const COL_W = ['25%', '15%', '15%', '15%', '15%', '15%'];
const COND_W = ['20%', '15%', '20%', '20%', '15%', '10%'];

export function ModelDescription({ nodes, conductorList, orbitalConfig }: ModelDescriptionProps) {
  return (
    <View>
      <Text style={styles.sectionTitle}>2. Model Description</Text>

      <Text style={styles.subsectionTitle}>Thermal Nodes ({nodes.length})</Text>
      <View style={styles.tableHeader}>
        {['Name', 'Type', 'T₀ (K)', 'Cap (J/K)', 'Mass (kg)', 'Area (m²)'].map((h, i) => (
          <Text key={h} style={[styles.tableHeaderCell, { width: COL_W[i] }]}>{h}</Text>
        ))}
      </View>
      {nodes.map((n, i) => (
        <View key={n.name + i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={[styles.tableCell, { width: COL_W[0] }]}>{n.name}</Text>
          <Text style={[styles.tableCell, { width: COL_W[1] }]}>{n.nodeType}</Text>
          <Text style={[styles.tableCell, { width: COL_W[2] }]}>{n.temperature.toFixed(1)}</Text>
          <Text style={[styles.tableCell, { width: COL_W[3] }]}>{n.capacitance?.toFixed(1) ?? '—'}</Text>
          <Text style={[styles.tableCell, { width: COL_W[4] }]}>{n.mass?.toFixed(2) ?? '—'}</Text>
          <Text style={[styles.tableCell, { width: COL_W[5] }]}>{n.area?.toFixed(4) ?? '—'}</Text>
        </View>
      ))}

      <Text style={styles.subsectionTitle}>Conductors ({conductorList.length})</Text>
      <View style={styles.tableHeader}>
        {['Name', 'Type', 'From', 'To', 'G (W/K)', 'VF'].map((h, i) => (
          <Text key={h} style={[styles.tableHeaderCell, { width: COND_W[i] }]}>{h}</Text>
        ))}
      </View>
      {conductorList.map((c, i) => (
        <View key={c.name + i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          <Text style={[styles.tableCell, { width: COND_W[0] }]}>{c.name}</Text>
          <Text style={[styles.tableCell, { width: COND_W[1] }]}>{c.conductorType}</Text>
          <Text style={[styles.tableCell, { width: COND_W[2] }]}>{c.nodeFromName}</Text>
          <Text style={[styles.tableCell, { width: COND_W[3] }]}>{c.nodeToName}</Text>
          <Text style={[styles.tableCell, { width: COND_W[4] }]}>{c.conductance?.toFixed(3) ?? '—'}</Text>
          <Text style={[styles.tableCell, { width: COND_W[5] }]}>{c.viewFactor?.toFixed(3) ?? '—'}</Text>
        </View>
      ))}

      {orbitalConfig && (
        <View>
          <Text style={styles.subsectionTitle}>Orbital Environment</Text>
          <Text style={styles.bodyText}>Altitude: {orbitalConfig.altitude} km</Text>
          <Text style={styles.bodyText}>Inclination: {orbitalConfig.inclination}°</Text>
          <Text style={styles.bodyText}>RAAN: {orbitalConfig.raan}°</Text>
          <Text style={styles.bodyText}>Epoch: {orbitalConfig.epoch}</Text>
        </View>
      )}
    </View>
  );
}
