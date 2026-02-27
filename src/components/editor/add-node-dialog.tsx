'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Circle } from 'lucide-react';
import { useEditorStore } from '@/lib/stores/editor-store';
import type { ThermalNode } from '@/lib/stores/editor-store';
import { useUnits } from '@/lib/hooks/use-units';
import { toDisplay } from '@/lib/units';
import { useUnitsStore } from '@/lib/stores/units-store';

export function AddNodeDialog() {
  const [open, setOpen] = useState(false);
  const addNode = useEditorStore((s) => s.addNode);
  const { label, parse } = useUnits();
  const { unitSystem, tempUnit } = useUnitsStore();

  // Default values in display units
  const defaultTemp = toDisplay(293, 'Temperature', unitSystem, tempUnit).toFixed(1);
  const [name, setName] = useState('');
  const [nodeType, setNodeType] = useState<ThermalNode['nodeType']>('diffusion');
  const [temperature, setTemperature] = useState(defaultTemp);
  const [capacitance, setCapacitance] = useState('100');
  const [boundaryTemp, setBoundaryTemp] = useState(defaultTemp);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addNode({
      name,
      nodeType,
      temperature: parse(parseFloat(temperature), 'Temperature'),
      capacitance: nodeType === 'diffusion' ? parseFloat(capacitance) : null,
      boundaryTemp: nodeType === 'boundary' ? parse(parseFloat(boundaryTemp), 'Temperature') : null,
    });
    setOpen(false);
    setName('');
    setTemperature(defaultTemp);
    setCapacitance('100');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Circle className="h-3.5 w-3.5" />
              Node
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Add thermal node</TooltipContent>
      </Tooltip>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Thermal Node</DialogTitle>
            <DialogDescription>
              Add a new node to the thermal network.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-6">
            <div className="space-y-2">
              <Label htmlFor="node-name">Name</Label>
              <Input
                id="node-name"
                placeholder="e.g., Solar Panel Top"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-white/5"
              />
            </div>
            <div className="space-y-2">
              <Label>Node Type</Label>
              <Select value={nodeType} onValueChange={(v) => setNodeType(v as ThermalNode['nodeType'])}>
                <SelectTrigger className="bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diffusion">Diffusion (thermal mass)</SelectItem>
                  <SelectItem value="arithmetic">Arithmetic (massless)</SelectItem>
                  <SelectItem value="boundary">Boundary (fixed temp)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-temp">Initial Temperature ({label('Temperature')})</Label>
              <Input
                id="node-temp"
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                required
                step="0.1"
                className="bg-white/5"
              />
            </div>
            {nodeType === 'diffusion' && (
              <div className="space-y-2">
                <Label htmlFor="node-cap">Capacitance (J/K)</Label>
                <Input
                  id="node-cap"
                  type="number"
                  value={capacitance}
                  onChange={(e) => setCapacitance(e.target.value)}
                  required
                  min="0.001"
                  step="0.1"
                  className="bg-white/5"
                />
              </div>
            )}
            {nodeType === 'boundary' && (
              <div className="space-y-2">
                <Label htmlFor="node-boundary">Boundary Temperature ({label('Temperature')})</Label>
                <Input
                  id="node-boundary"
                  type="number"
                  value={boundaryTemp}
                  onChange={(e) => setBoundaryTemp(e.target.value)}
                  required
                  step="0.1"
                  className="bg-white/5"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="glow" disabled={!name.trim()}>
              Add Node
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
