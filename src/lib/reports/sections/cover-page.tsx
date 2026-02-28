import React from 'react';
import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';

const s = StyleSheet.create({
  page: {
    backgroundColor: BRAND.dark,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    padding: 60,
  },
  brand: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: BRAND.gray400,
    marginBottom: 60,
  },
  divider: {
    width: 80,
    height: 2,
    backgroundColor: BRAND.primary,
    marginBottom: 40,
  },
  projectName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.white,
    marginBottom: 10,
    textAlign: 'center',
  },
  modelName: {
    fontSize: 16,
    color: BRAND.primaryLight,
    marginBottom: 40,
    textAlign: 'center',
  },
  label: {
    fontSize: 9,
    color: BRAND.gray400,
    marginBottom: 2,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
  },
  value: {
    fontSize: 12,
    color: BRAND.white,
    marginBottom: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    fontSize: 8,
    color: BRAND.gray400,
  },
});

interface CoverPageProps {
  projectName: string;
  modelName: string;
  reportDate: string;
  analystName: string;
  version: string;
}

export function CoverPage({ projectName, modelName, reportDate, analystName, version }: CoverPageProps) {
  return (
    <Page size="A4" style={s.page}>
      <View style={s.container}>
        <Text style={s.brand}>VERIXOS</Text>
        <Text style={s.subtitle}>Spacecraft Thermal Analysis</Text>
        <View style={s.divider} />
        <Text style={s.projectName}>{projectName}</Text>
        <Text style={s.modelName}>{modelName}</Text>
        <Text style={s.label}>Report Date</Text>
        <Text style={s.value}>{reportDate}</Text>
        <Text style={s.label}>Analyst</Text>
        <Text style={s.value}>{analystName}</Text>
        <Text style={s.label}>Version</Text>
        <Text style={s.value}>Verixos v{version}</Text>
      </View>
      <Text style={s.footer}>THERMAL ANALYSIS REPORT — CONFIDENTIAL</Text>
    </Page>
  );
}
