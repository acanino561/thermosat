import React from 'react';
import { renderToBuffer, Document } from '@react-pdf/renderer';
import { db } from '@/lib/db/client';
import {
  projects,
  thermalModels,
  thermalNodes,
  conductors,
  heatLoads,
  simulationRuns,
  simulationResults,
  materials,
  users,
} from '@/lib/db/schema';
import type {
  OrbitalConfig,
  SimulationConfigData,
  NodeTemperatureHistory,
  ConductorFlowHistory,
} from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

import { CoverPage } from './sections/cover-page';
import { PageWrapper } from './sections/page-wrapper';
import { ExecutiveSummary } from './sections/executive-summary';
import { ModelDescription } from './sections/model-description';
import { SimulationConfig } from './sections/simulation-config';
import { ResultsTemperature } from './sections/results-temperature';
import { ResultsPlots } from './sections/results-plots';
import { HeatFlowSummary } from './sections/heat-flow-summary';
import { VVStatement } from './sections/vv-statement';
import { Appendix } from './sections/appendix';

// Use package.json version
const PKG_VERSION = '0.1.0';

export async function generateThermalReport(
  runId: string,
  projectId: string,
  modelId: string,
  userId: string,
): Promise<Buffer> {
  // ── Fetch all required data ──────────────────────────────────────────
  const [[project], [model], [run], [user]] = await Promise.all([
    db.select().from(projects).where(eq(projects.id, projectId)),
    db.select().from(thermalModels).where(eq(thermalModels.id, modelId)),
    db.select().from(simulationRuns).where(eq(simulationRuns.id, runId)),
    db.select().from(users).where(eq(users.id, userId)),
  ]);

  if (!project || !model || !run) {
    throw new Error('Required data not found for report generation');
  }

  const [nodeList, conductorList, heatLoadList, resultRows] = await Promise.all([
    db.select().from(thermalNodes).where(eq(thermalNodes.modelId, modelId)),
    db.select().from(conductors).where(eq(conductors.modelId, modelId)),
    db.select().from(heatLoads).where(eq(heatLoads.modelId, modelId)),
    db.select().from(simulationResults).where(eq(simulationResults.runId, runId)),
  ]);

  // Fetch materials used by nodes
  const materialIds = nodeList
    .map((n) => n.materialId)
    .filter((id): id is string => id != null);
  const materialList =
    materialIds.length > 0
      ? await db.select().from(materials).where(inArray(materials.id, materialIds))
      : [];

  // ── Build node name map ──────────────────────────────────────────────
  const nodeNameMap = new Map(nodeList.map((n) => [n.id, n.name]));

  // ── Compute node summaries from results ──────────────────────────────
  const nodeSummaries = resultRows.map((r) => {
    const tv = r.timeValues as NodeTemperatureHistory;
    const temps = tv.temperatures;
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    return {
      name: nodeNameMap.get(r.nodeId) ?? r.nodeId,
      minTemp: min,
      maxTemp: max,
      avgTemp: avg,
      initialTemp: temps[0] ?? 0,
      finalTemp: temps[temps.length - 1] ?? 0,
    };
  });

  // ── Time slices for plots section ────────────────────────────────────
  const timeSlices = resultRows.map((r) => {
    const tv = r.timeValues as NodeTemperatureHistory;
    const midIdx = Math.floor(tv.temperatures.length / 2);
    return {
      name: nodeNameMap.get(r.nodeId) ?? r.nodeId,
      firstTemp: tv.temperatures[0] ?? 0,
      midTemp: tv.temperatures[midIdx] ?? 0,
      finalTemp: tv.temperatures[tv.temperatures.length - 1] ?? 0,
    };
  });

  const config = run.config as SimulationConfigData;
  const timeStart = config.timeStart;
  const timeEnd = config.timeEnd;
  const timeMid = (timeStart + timeEnd) / 2;

  // ── Heat flow data ───────────────────────────────────────────────────
  const heatPaths: Array<{
    conductorName: string;
    fromNode: string;
    toNode: string;
    avgFlow: number;
    maxFlow: number;
  }> = [];

  for (const r of resultRows) {
    const flows = r.conductorFlows as ConductorFlowHistory[] | null;
    if (!flows) continue;
    for (const cf of flows) {
      const cond = conductorList.find((c) => c.id === cf.conductorId);
      if (!cond) continue;
      const absFlows = cf.flows.map(Math.abs);
      const avg = absFlows.reduce((a, b) => a + b, 0) / absFlows.length;
      const max = Math.max(...absFlows);
      // Avoid duplicates
      if (!heatPaths.find((hp) => hp.conductorName === cond.name)) {
        heatPaths.push({
          conductorName: cond.name,
          fromNode: nodeNameMap.get(cond.nodeFromId) ?? cond.nodeFromId,
          toNode: nodeNameMap.get(cond.nodeToId) ?? cond.nodeToId,
          avgFlow: avg,
          maxFlow: max,
        });
      }
    }
  }

  // ── Conductor info for model description ─────────────────────────────
  const conductorInfo = conductorList.map((c) => ({
    name: c.name,
    conductorType: c.conductorType,
    nodeFromName: nodeNameMap.get(c.nodeFromId) ?? c.nodeFromId,
    nodeToName: nodeNameMap.get(c.nodeToId) ?? c.nodeToId,
    conductance: c.conductance,
    viewFactor: c.viewFactor,
  }));

  // ── Node info for model description ──────────────────────────────────
  const nodeInfo = nodeList.map((n) => ({
    name: n.name,
    nodeType: n.nodeType,
    temperature: n.temperature,
    capacitance: n.capacitance,
    mass: n.mass,
    area: n.area,
  }));

  // ── Material info for appendix ───────────────────────────────────────
  const matInfo = materialList.map((m) => ({
    name: m.name,
    category: m.category,
    conductivity: m.conductivity,
    specificHeat: m.specificHeat,
    density: m.density,
    absorptivity: m.absorptivity,
    emissivity: m.emissivity,
  }));

  const reportDate = new Date().toISOString().split('T')[0];
  const analystName = user?.name ?? user?.email ?? 'Unknown';
  const orbitalConfig = model.orbitalConfig as OrbitalConfig | null;

  const modelParamsJson = JSON.stringify(
    {
      nodes: nodeList.length,
      conductors: conductorList.length,
      heatLoads: heatLoadList.length,
      orbitalConfig,
      simulationConfig: config,
    },
    null,
    2,
  );

  // ── Render PDF ───────────────────────────────────────────────────────
  const doc = (
    <Document
      title={`Thermal Report — ${project.name} — ${model.name}`}
      author="Verixos"
      subject="Spacecraft Thermal Analysis Report"
    >
      <CoverPage
        projectName={project.name}
        modelName={model.name}
        reportDate={reportDate}
        analystName={analystName}
        version={PKG_VERSION}
      />
      <PageWrapper reportDate={reportDate}>
        <ExecutiveSummary
          nodeSummaries={nodeSummaries}
          simulationType={run.simulationType}
        />
      </PageWrapper>
      <PageWrapper reportDate={reportDate}>
        <ModelDescription
          nodes={nodeInfo}
          conductorList={conductorInfo}
          orbitalConfig={orbitalConfig}
        />
      </PageWrapper>
      <PageWrapper reportDate={reportDate}>
        <SimulationConfig
          simulationType={run.simulationType}
          config={config}
        />
      </PageWrapper>
      <PageWrapper reportDate={reportDate}>
        <ResultsTemperature nodeResults={nodeSummaries} />
      </PageWrapper>
      <PageWrapper reportDate={reportDate}>
        <ResultsPlots
          timeSlices={timeSlices}
          timeStart={timeStart}
          timeMid={timeMid}
          timeEnd={timeEnd}
        />
      </PageWrapper>
      <PageWrapper reportDate={reportDate}>
        <HeatFlowSummary
          heatPaths={heatPaths}
          energyBalanceError={run.energyBalanceError}
        />
      </PageWrapper>
      <PageWrapper reportDate={reportDate}>
        <VVStatement />
      </PageWrapper>
      <PageWrapper reportDate={reportDate}>
        <Appendix materials={matInfo} modelParamsJson={modelParamsJson} />
      </PageWrapper>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}
