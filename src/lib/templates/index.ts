/**
 * Project templates for onboarding flow.
 * Each template defines nodes and conductors to be created in the DB.
 */

export interface TemplateNode {
  name: string;
  nodeType: 'diffusion' | 'arithmetic' | 'boundary';
  temperature: number; // K
  capacitance?: number; // J/K
  area?: number; // m²
  mass?: number; // kg
  absorptivity?: number;
  emissivity?: number;
  boundaryTemp?: number; // K, for boundary nodes
}

export interface TemplateConductor {
  name: string;
  conductorType: 'linear' | 'radiation' | 'contact';
  fromNode: string; // references node name
  toNode: string;
  conductance?: number; // W/K
  area?: number; // m²
  viewFactor?: number;
  emissivity?: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  nodeCount: number;
  nodes: TemplateNode[];
  conductors: TemplateConductor[];
}

// Al 6061 properties: k=167 W/mK, cp=896 J/kgK, ρ=2700 kg/m³
// α_s=0.379, ε_IR=0.04 (bare), painted: α_s=0.92, ε_IR=0.85

export const templates: ProjectTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Model',
    description: 'Empty model — start from scratch',
    nodeCount: 0,
    nodes: [],
    conductors: [],
  },
  {
    id: '1u-cubesat',
    name: '1U CubeSat',
    description: '6 nodes: ±X/±Y/±Z faces, 0.01 m² each, Al 6061',
    nodeCount: 6,
    nodes: [
      { name: '+X Face', nodeType: 'diffusion', temperature: 293, capacitance: 24.2, area: 0.01, mass: 0.027, absorptivity: 0.379, emissivity: 0.04 },
      { name: '-X Face', nodeType: 'diffusion', temperature: 293, capacitance: 24.2, area: 0.01, mass: 0.027, absorptivity: 0.379, emissivity: 0.04 },
      { name: '+Y Face', nodeType: 'diffusion', temperature: 293, capacitance: 24.2, area: 0.01, mass: 0.027, absorptivity: 0.379, emissivity: 0.04 },
      { name: '-Y Face', nodeType: 'diffusion', temperature: 293, capacitance: 24.2, area: 0.01, mass: 0.027, absorptivity: 0.379, emissivity: 0.04 },
      { name: '+Z Face', nodeType: 'diffusion', temperature: 293, capacitance: 24.2, area: 0.01, mass: 0.027, absorptivity: 0.379, emissivity: 0.04 },
      { name: '-Z Face', nodeType: 'diffusion', temperature: 293, capacitance: 24.2, area: 0.01, mass: 0.027, absorptivity: 0.379, emissivity: 0.04 },
    ],
    conductors: [
      { name: '+X to +Y', conductorType: 'linear', fromNode: '+X Face', toNode: '+Y Face', conductance: 1.67 },
      { name: '+X to -Y', conductorType: 'linear', fromNode: '+X Face', toNode: '-Y Face', conductance: 1.67 },
      { name: '-X to +Y', conductorType: 'linear', fromNode: '-X Face', toNode: '+Y Face', conductance: 1.67 },
      { name: '-X to -Y', conductorType: 'linear', fromNode: '-X Face', toNode: '-Y Face', conductance: 1.67 },
      { name: '+Z to +X', conductorType: 'linear', fromNode: '+Z Face', toNode: '+X Face', conductance: 1.67 },
      { name: '+Z to -X', conductorType: 'linear', fromNode: '+Z Face', toNode: '-X Face', conductance: 1.67 },
      { name: '-Z to +X', conductorType: 'linear', fromNode: '-Z Face', toNode: '+X Face', conductance: 1.67 },
      { name: '-Z to -X', conductorType: 'linear', fromNode: '-Z Face', toNode: '-X Face', conductance: 1.67 },
    ],
  },
  {
    id: '3u-cubesat',
    name: '3U CubeSat',
    description: '12 nodes: body panels + solar panels',
    nodeCount: 12,
    nodes: [
      // Body panels (3U: 10cm x 30cm = 0.03 m² for long sides, 0.01 m² for end caps)
      { name: '+X Panel', nodeType: 'diffusion', temperature: 293, capacitance: 72.6, area: 0.03, mass: 0.081, absorptivity: 0.379, emissivity: 0.04 },
      { name: '-X Panel', nodeType: 'diffusion', temperature: 293, capacitance: 72.6, area: 0.03, mass: 0.081, absorptivity: 0.379, emissivity: 0.04 },
      { name: '+Y Panel', nodeType: 'diffusion', temperature: 293, capacitance: 72.6, area: 0.03, mass: 0.081, absorptivity: 0.379, emissivity: 0.04 },
      { name: '-Y Panel', nodeType: 'diffusion', temperature: 293, capacitance: 72.6, area: 0.03, mass: 0.081, absorptivity: 0.379, emissivity: 0.04 },
      { name: '+Z End Cap', nodeType: 'diffusion', temperature: 293, capacitance: 24.2, area: 0.01, mass: 0.027, absorptivity: 0.379, emissivity: 0.04 },
      { name: '-Z End Cap', nodeType: 'diffusion', temperature: 293, capacitance: 24.2, area: 0.01, mass: 0.027, absorptivity: 0.379, emissivity: 0.04 },
      // Deployable solar panels (2 wings, each 0.03 m²)
      { name: 'Solar +Y Outer', nodeType: 'diffusion', temperature: 293, capacitance: 20.0, area: 0.03, mass: 0.05, absorptivity: 0.92, emissivity: 0.85 },
      { name: 'Solar +Y Inner', nodeType: 'diffusion', temperature: 293, capacitance: 20.0, area: 0.03, mass: 0.05, absorptivity: 0.92, emissivity: 0.85 },
      { name: 'Solar -Y Outer', nodeType: 'diffusion', temperature: 293, capacitance: 20.0, area: 0.03, mass: 0.05, absorptivity: 0.92, emissivity: 0.85 },
      { name: 'Solar -Y Inner', nodeType: 'diffusion', temperature: 293, capacitance: 20.0, area: 0.03, mass: 0.05, absorptivity: 0.92, emissivity: 0.85 },
      // Internal
      { name: 'Battery Pack', nodeType: 'diffusion', temperature: 293, capacitance: 150.0, area: 0.005, mass: 0.3, absorptivity: 0.5, emissivity: 0.5 },
      { name: 'OBC', nodeType: 'diffusion', temperature: 293, capacitance: 50.0, area: 0.003, mass: 0.1, absorptivity: 0.5, emissivity: 0.5 },
    ],
    conductors: [
      { name: '+X to +Y', conductorType: 'linear', fromNode: '+X Panel', toNode: '+Y Panel', conductance: 5.0 },
      { name: '+X to -Y', conductorType: 'linear', fromNode: '+X Panel', toNode: '-Y Panel', conductance: 5.0 },
      { name: '-X to +Y', conductorType: 'linear', fromNode: '-X Panel', toNode: '+Y Panel', conductance: 5.0 },
      { name: '-X to -Y', conductorType: 'linear', fromNode: '-X Panel', toNode: '-Y Panel', conductance: 5.0 },
      { name: '+Y to Solar +Y Inner', conductorType: 'contact', fromNode: '+Y Panel', toNode: 'Solar +Y Inner', conductance: 0.5 },
      { name: '-Y to Solar -Y Inner', conductorType: 'contact', fromNode: '-Y Panel', toNode: 'Solar -Y Inner', conductance: 0.5 },
      { name: 'Solar +Y Inner to Outer', conductorType: 'linear', fromNode: 'Solar +Y Inner', toNode: 'Solar +Y Outer', conductance: 2.0 },
      { name: 'Solar -Y Inner to Outer', conductorType: 'linear', fromNode: 'Solar -Y Inner', toNode: 'Solar -Y Outer', conductance: 2.0 },
      { name: 'Battery to -Z', conductorType: 'contact', fromNode: 'Battery Pack', toNode: '-Z End Cap', conductance: 3.0 },
      { name: 'OBC to +Z', conductorType: 'contact', fromNode: 'OBC', toNode: '+Z End Cap', conductance: 1.5 },
    ],
  },
  {
    id: 'satellite-bus',
    name: 'Simple Satellite Bus',
    description: '20 nodes: bus panels + internal components + solar array',
    nodeCount: 20,
    nodes: [
      // Bus panels (1m x 1m = 1 m² each)
      { name: 'Bus +X', nodeType: 'diffusion', temperature: 293, capacitance: 2420, area: 1.0, mass: 2.7, absorptivity: 0.379, emissivity: 0.04 },
      { name: 'Bus -X', nodeType: 'diffusion', temperature: 293, capacitance: 2420, area: 1.0, mass: 2.7, absorptivity: 0.379, emissivity: 0.04 },
      { name: 'Bus +Y', nodeType: 'diffusion', temperature: 293, capacitance: 2420, area: 1.0, mass: 2.7, absorptivity: 0.379, emissivity: 0.04 },
      { name: 'Bus -Y', nodeType: 'diffusion', temperature: 293, capacitance: 2420, area: 1.0, mass: 2.7, absorptivity: 0.379, emissivity: 0.04 },
      { name: 'Bus +Z (Nadir)', nodeType: 'diffusion', temperature: 293, capacitance: 2420, area: 1.0, mass: 2.7, absorptivity: 0.379, emissivity: 0.04 },
      { name: 'Bus -Z (Zenith)', nodeType: 'diffusion', temperature: 293, capacitance: 2420, area: 1.0, mass: 2.7, absorptivity: 0.379, emissivity: 0.04 },
      // Radiator panels (painted, high emissivity)
      { name: 'Radiator +X', nodeType: 'diffusion', temperature: 293, capacitance: 1200, area: 0.5, mass: 1.5, absorptivity: 0.15, emissivity: 0.92 },
      { name: 'Radiator -X', nodeType: 'diffusion', temperature: 293, capacitance: 1200, area: 0.5, mass: 1.5, absorptivity: 0.15, emissivity: 0.92 },
      // Solar array (2 wings)
      { name: 'Solar Wing +Y A', nodeType: 'diffusion', temperature: 293, capacitance: 500, area: 2.0, mass: 3.0, absorptivity: 0.92, emissivity: 0.85 },
      { name: 'Solar Wing +Y B', nodeType: 'diffusion', temperature: 293, capacitance: 500, area: 2.0, mass: 3.0, absorptivity: 0.92, emissivity: 0.85 },
      { name: 'Solar Wing -Y A', nodeType: 'diffusion', temperature: 293, capacitance: 500, area: 2.0, mass: 3.0, absorptivity: 0.92, emissivity: 0.85 },
      { name: 'Solar Wing -Y B', nodeType: 'diffusion', temperature: 293, capacitance: 500, area: 2.0, mass: 3.0, absorptivity: 0.92, emissivity: 0.85 },
      // Internal components
      { name: 'Battery Module', nodeType: 'diffusion', temperature: 293, capacitance: 3000, area: 0.1, mass: 8.0, absorptivity: 0.5, emissivity: 0.5 },
      { name: 'Reaction Wheel Assy', nodeType: 'diffusion', temperature: 293, capacitance: 800, area: 0.05, mass: 2.0, absorptivity: 0.5, emissivity: 0.5 },
      { name: 'Star Tracker', nodeType: 'diffusion', temperature: 293, capacitance: 200, area: 0.02, mass: 0.5, absorptivity: 0.5, emissivity: 0.5 },
      { name: 'Transponder', nodeType: 'diffusion', temperature: 293, capacitance: 400, area: 0.03, mass: 1.0, absorptivity: 0.5, emissivity: 0.5 },
      { name: 'OBC / CDH', nodeType: 'diffusion', temperature: 293, capacitance: 300, area: 0.02, mass: 0.8, absorptivity: 0.5, emissivity: 0.5 },
      { name: 'Propulsion Tank', nodeType: 'diffusion', temperature: 293, capacitance: 1500, area: 0.08, mass: 5.0, absorptivity: 0.5, emissivity: 0.5 },
      // Boundary nodes
      { name: 'Deep Space', nodeType: 'boundary', temperature: 2.7, boundaryTemp: 2.7, area: 0, mass: 0 },
      { name: 'Earth IR', nodeType: 'boundary', temperature: 255, boundaryTemp: 255, area: 0, mass: 0 },
    ],
    conductors: [
      // Bus panel conduction
      { name: 'Bus +X to +Y', conductorType: 'linear', fromNode: 'Bus +X', toNode: 'Bus +Y', conductance: 50.0 },
      { name: 'Bus +X to -Y', conductorType: 'linear', fromNode: 'Bus +X', toNode: 'Bus -Y', conductance: 50.0 },
      { name: 'Bus -X to +Y', conductorType: 'linear', fromNode: 'Bus -X', toNode: 'Bus +Y', conductance: 50.0 },
      { name: 'Bus -X to -Y', conductorType: 'linear', fromNode: 'Bus -X', toNode: 'Bus -Y', conductance: 50.0 },
      // Radiator mounting
      { name: 'Rad +X to Bus +X', conductorType: 'contact', fromNode: 'Radiator +X', toNode: 'Bus +X', conductance: 20.0 },
      { name: 'Rad -X to Bus -X', conductorType: 'contact', fromNode: 'Radiator -X', toNode: 'Bus -X', conductance: 20.0 },
      // Solar array hinges
      { name: 'Solar +Y A to Bus +Y', conductorType: 'contact', fromNode: 'Solar Wing +Y A', toNode: 'Bus +Y', conductance: 1.0 },
      { name: 'Solar +Y A to B', conductorType: 'linear', fromNode: 'Solar Wing +Y A', toNode: 'Solar Wing +Y B', conductance: 5.0 },
      { name: 'Solar -Y A to Bus -Y', conductorType: 'contact', fromNode: 'Solar Wing -Y A', toNode: 'Bus -Y', conductance: 1.0 },
      { name: 'Solar -Y A to B', conductorType: 'linear', fromNode: 'Solar Wing -Y A', toNode: 'Solar Wing -Y B', conductance: 5.0 },
      // Internal component mounting
      { name: 'Battery to Bus -Z', conductorType: 'contact', fromNode: 'Battery Module', toNode: 'Bus -Z (Zenith)', conductance: 10.0 },
      { name: 'RWA to Bus +Z', conductorType: 'contact', fromNode: 'Reaction Wheel Assy', toNode: 'Bus +Z (Nadir)', conductance: 5.0 },
      { name: 'Transponder to Rad +X', conductorType: 'contact', fromNode: 'Transponder', toNode: 'Radiator +X', conductance: 8.0 },
      { name: 'OBC to Rad -X', conductorType: 'contact', fromNode: 'OBC / CDH', toNode: 'Radiator -X', conductance: 6.0 },
      // Radiation to space
      { name: 'Rad +X to Space', conductorType: 'radiation', fromNode: 'Radiator +X', toNode: 'Deep Space', area: 0.5, viewFactor: 0.9, emissivity: 0.92 },
      { name: 'Rad -X to Space', conductorType: 'radiation', fromNode: 'Radiator -X', toNode: 'Deep Space', area: 0.5, viewFactor: 0.9, emissivity: 0.92 },
    ],
  },
];

export function getTemplate(id: string): ProjectTemplate | undefined {
  return templates.find((t) => t.id === id);
}
