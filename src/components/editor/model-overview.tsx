'use client';

import { useEditorStore } from '@/lib/stores/editor-store';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Circle, GitBranch, Flame, Globe } from 'lucide-react';

export function ModelOverview() {
  const { nodes, conductors, heatLoads, orbitalConfig, modelName } = useEditorStore();

  const diffusionCount = nodes.filter((n) => n.nodeType === 'diffusion').length;
  const arithmeticCount = nodes.filter((n) => n.nodeType === 'arithmetic').length;
  const boundaryCount = nodes.filter((n) => n.nodeType === 'boundary').length;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">Model Summary</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Circle className="h-3.5 w-3.5 text-accent-blue" />
              Diffusion Nodes
            </div>
            <Badge variant="blue">{diffusionCount}</Badge>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Circle className="h-3.5 w-3.5 text-accent-cyan" />
              Arithmetic Nodes
            </div>
            <Badge variant="cyan">{arithmeticCount}</Badge>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Circle className="h-3.5 w-3.5 text-accent-orange" />
              Boundary Nodes
            </div>
            <Badge variant="orange">{boundaryCount}</Badge>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GitBranch className="h-3.5 w-3.5 text-green-400" />
              Conductors
            </div>
            <Badge variant="outline">{conductors.length}</Badge>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-accent-orange" />
              Heat Loads
            </div>
            <Badge variant="outline">{heatLoads.length}</Badge>
          </div>
        </div>
      </div>

      {orbitalConfig && (
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-accent-blue" />
            <h4 className="text-sm font-medium">Orbital Configuration</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Orbit Type</Label>
              <div className="text-sm font-mono">{(orbitalConfig.orbitType ?? 'leo').toUpperCase()}</div>
            </div>
            {orbitalConfig.orbitType === 'heo' ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Apogee (km)</Label>
                  <div className="text-sm font-mono">{orbitalConfig.apogeeAltitude}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Perigee (km)</Label>
                  <div className="text-sm font-mono">{orbitalConfig.perigeeAltitude}</div>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs">Altitude (km)</Label>
                <div className="text-sm font-mono">{orbitalConfig.altitude}</div>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Inclination (°)</Label>
              <div className="text-sm font-mono">{orbitalConfig.inclination}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">RAAN (°)</Label>
              <div className="text-sm font-mono">{orbitalConfig.raan}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Epoch</Label>
              <div className="text-sm font-mono truncate">{orbitalConfig.epoch}</div>
            </div>
          </div>
        </div>
      )}

      {!orbitalConfig && (
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-muted-foreground">Orbital Config</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            No orbital configuration set. Add one to enable orbital heat load calculations.
          </p>
        </div>
      )}

      <div className="pt-4 border-t border-white/10">
        <p className="text-xs text-muted-foreground">
          Click on a node or conductor in the tree or graph to view and edit its properties.
        </p>
      </div>
    </div>
  );
}
