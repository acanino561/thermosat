import React from 'react';
import { Page, View, Text } from '@react-pdf/renderer';
import { styles } from '../styles';

interface PageWrapperProps {
  reportDate: string;
  children: React.ReactNode;
}

export function PageWrapper({ reportDate, children }: PageWrapperProps) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.header} fixed>
        Verixos — Spacecraft Thermal Analysis
      </Text>
      <View>{children}</View>
      <View style={styles.footer} fixed>
        <Text>{reportDate}</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        <Text>CONFIDENTIAL</Text>
      </View>
    </Page>
  );
}
