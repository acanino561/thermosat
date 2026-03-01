import type {
  thermalNodes,
  conductors,
  heatLoads,
  simulationResults,
} from '@/lib/db/schema';

type ThermalNode = typeof thermalNodes.$inferSelect;
type Conductor = typeof conductors.$inferSelect;
type HeatLoad = typeof heatLoads.$inferSelect;
type SimulationResult = typeof simulationResults.$inferSelect;

export interface AdvisorFinding {
  category: 'model_quality' | 'results' | 'materials' | 'energy_balance';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedEntities: string[];
  recommendation: string;
}

export function runDeterministicChecks(
  nodes: ThermalNode[],
  modelConductors: Conductor[],
  modelHeatLoads: HeatLoad[],
  simResults?: SimulationResult[],
): AdvisorFinding[] {
  const findings: AdvisorFinding[] = [];

  // 1. Isolated node — no conductors attached
  for (const node of nodes) {
    const hasConn = modelConductors.some(
      (c) => c.nodeFromId === node.id || c.nodeToId === node.id,
    );
    if (!hasConn) {
      findings.push({
        category: 'model_quality',
        severity: 'warning',
        title: 'Isolated node',
        description: `Node "${node.name}" has no conductors attached.`,
        affectedEntities: [node.id],
        recommendation:
          'Connect this node to at least one other node via a conductor, or remove it if unused.',
      });
    }
  }

  // 2. Missing orbital coupling
  const nodesWithOrbitalLoads = new Set(
    modelHeatLoads
      .filter((hl) => hl.loadType === 'orbital')
      .map((hl) => hl.nodeId),
  );
  for (const node of nodes) {
    const hasRadProps =
      (node.absorptivity != null && node.absorptivity > 0) ||
      (node.emissivity != null && node.emissivity > 0);
    if (hasRadProps && !nodesWithOrbitalLoads.has(node.id)) {
      findings.push({
        category: 'model_quality',
        severity: 'info',
        title: 'Missing orbital coupling',
        description: `Node "${node.name}" has radiative surface properties but no orbital heat load references it.`,
        affectedEntities: [node.id],
        recommendation:
          'Add an orbital heat load to this node, or set absorptivity/emissivity to 0 if not externally exposed.',
      });
    }
  }

  // 3. Conductor magnitude — conductive conductor G > 500 W/K
  for (const cond of modelConductors) {
    if (
      cond.conductorType === 'linear' &&
      cond.conductance != null &&
      cond.conductance > 500
    ) {
      findings.push({
        category: 'model_quality',
        severity: 'warning',
        title: 'High conductor magnitude',
        description: `Conductor "${cond.name}" has conductance ${cond.conductance} W/K, which is unusually high.`,
        affectedEntities: [cond.id],
        recommendation:
          'Verify the conductance value. High values may indicate the node should be lumped or the geometry needs review.',
      });
    }
  }

  // 4. Energy balance (requires sim results)
  if (simResults && simResults.length > 0) {
    // Build a map of node -> final temperature from sim results
    const nodeTemps = new Map<string, number>();
    for (const sr of simResults) {
      const tv = sr.timeValues;
      if (tv && tv.temperatures && tv.temperatures.length > 0) {
        nodeTemps.set(sr.nodeId, tv.temperatures[tv.temperatures.length - 1]);
      }
    }

    // For each node, check energy balance from conductor flows
    for (const sr of simResults) {
      if (!sr.conductorFlows || sr.conductorFlows.length === 0) continue;
      let totalFlowIn = 0;
      let totalFlowOut = 0;
      for (const cf of sr.conductorFlows) {
        if (cf.flows && cf.flows.length > 0) {
          const lastFlow = cf.flows[cf.flows.length - 1];
          if (lastFlow > 0) totalFlowIn += lastFlow;
          else totalFlowOut += Math.abs(lastFlow);
        }
      }
      // Add heat loads for this node
      const nodeLoads = modelHeatLoads.filter((hl) => hl.nodeId === sr.nodeId);
      for (const hl of nodeLoads) {
        if (hl.value != null && hl.value > 0) totalFlowIn += hl.value;
      }

      const total = totalFlowIn + totalFlowOut;
      if (total > 0) {
        const imbalance = Math.abs(totalFlowIn - totalFlowOut) / total;
        if (imbalance > 0.05) {
          const node = nodes.find((n) => n.id === sr.nodeId);
          findings.push({
            category: 'energy_balance',
            severity: 'warning',
            title: 'Energy balance issue',
            description: `Node "${node?.name ?? sr.nodeId}" has ${(imbalance * 100).toFixed(1)}% energy imbalance at steady state.`,
            affectedEntities: [sr.nodeId],
            recommendation:
              'Check boundary conditions and heat loads. Large imbalances may indicate missing heat paths.',
          });
        }
      }
    }
  }

  // 5. Temperature limit margin (nodes don't have tempLimitMin/Max in current schema,
  //    but we check if the fields exist for forward compatibility)
  if (simResults && simResults.length > 0) {
    for (const node of nodes) {
      const nodeWithLimits = node as ThermalNode & {
        tempLimitMin?: number | null;
        tempLimitMax?: number | null;
      };
      const sr = simResults.find((r) => r.nodeId === node.id);
      if (!sr || !sr.timeValues || !sr.timeValues.temperatures) continue;
      const temps = sr.timeValues.temperatures;
      const minT = Math.min(...temps);
      const maxT = Math.max(...temps);

      if (nodeWithLimits.tempLimitMin != null) {
        const margin = minT - nodeWithLimits.tempLimitMin;
        if (margin < 10) {
          findings.push({
            category: 'results',
            severity: margin < 5 ? 'critical' : 'warning',
            title: 'Near minimum temperature limit',
            description: `Node "${node.name}" reaches ${minT.toFixed(1)} K, only ${margin.toFixed(1)} K above its lower limit.`,
            affectedEntities: [node.id],
            recommendation:
              'Add heater power or improve insulation to increase margin.',
          });
        }
      }
      if (nodeWithLimits.tempLimitMax != null) {
        const margin = nodeWithLimits.tempLimitMax - maxT;
        if (margin < 10) {
          findings.push({
            category: 'results',
            severity: margin < 5 ? 'critical' : 'warning',
            title: 'Near maximum temperature limit',
            description: `Node "${node.name}" reaches ${maxT.toFixed(1)} K, only ${margin.toFixed(1)} K below its upper limit.`,
            affectedEntities: [node.id],
            recommendation:
              'Increase radiator area or reduce power dissipation to increase margin.',
          });
        }
      }
    }
  }

  // 6. Capacitance sanity
  for (const node of nodes) {
    if (
      node.capacitance != null &&
      node.capacitance > 0 &&
      node.mass != null &&
      node.mass > 0
    ) {
      if (node.capacitance > node.mass * 5000) {
        findings.push({
          category: 'materials',
          severity: 'info',
          title: 'Unusually high specific heat',
          description: `Node "${node.name}" has effective specific heat of ${(node.capacitance / node.mass).toFixed(0)} J/(kg·K), exceeding 5000 J/(kg·K).`,
          affectedEntities: [node.id],
          recommendation:
            'Verify capacitance and mass values. Most spacecraft materials have specific heat below 2000 J/(kg·K).',
        });
      }
    }
  }

  // 7. Lumped assumption — high conductance but low capacitance
  for (const node of nodes) {
    const totalConductance = modelConductors
      .filter((c) => c.nodeFromId === node.id || c.nodeToId === node.id)
      .reduce((sum, c) => sum + (c.conductance ?? 0), 0);

    if (totalConductance > 100 && (node.capacitance ?? 0) < 10) {
      findings.push({
        category: 'model_quality',
        severity: 'info',
        title: 'Lumped assumption concern',
        description: `Node "${node.name}" has high total conductance (${totalConductance.toFixed(1)} W/K) but low capacitance (${(node.capacitance ?? 0).toFixed(1)} J/K), suggesting the lumped approximation may be invalid.`,
        affectedEntities: [node.id],
        recommendation:
          'Consider splitting this node into multiple sub-nodes for better spatial resolution.',
      });
    }
  }

  return findings;
}
