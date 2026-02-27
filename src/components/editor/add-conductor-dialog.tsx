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
import { GitBranch } from 'lucide-react';
import { useEditorStore } from '@/lib/stores/editor-store';
import type { Conductor } from '@/lib/stores/editor-store';
import { useUnits } from '@/lib/hooks/use-units';

export function AddConductorDialog() {
  const [open, setOpen] = useState(false);
  const nodes = useEditorStore((s) => s.nodes);
  const addConductor = useEditorStore((s) => s.addConductor);
  const { label, parse } = useUnits();

  const [name, setName] = useState('');
  const [conductorType, setConductorType] = useState<Conductor['conductorType']>('linear');
  const [nodeFromId, setNodeFromId] = useState('');
  const [nodeToId, setNodeToId] = useState('');
  const [conductance, setConductance] = useState('1.0');
  const [area, setArea] = useState('0.01');
  const [viewFactor, setViewFactor] = useState('1.0');
  const [emissivity, setEmissivity] = useState('0.85');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addConductor({
      name,
      conductorType,
      nodeFromId,
      nodeToId,
      conductance: conductorType !== 'radiation' ? parse(parseFloat(conductance), 'Conductance') : null,
      area: conductorType === 'radiation' ? parse(parseFloat(area), 'Area') : null,
      viewFactor: conductorType === 'radiation' ? parseFloat(viewFactor) : null,
      emissivity: conductorType === 'radiation' ? parseFloat(emissivity) : null,
    });
    setOpen(false);
    setName('');
    setNodeFromId('');
    setNodeToId('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5" disabled={nodes.length < 2}>
              <GitBranch className="h-3.5 w-3.5" />
              Conductor
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Add conductor between nodes</TooltipContent>
      </Tooltip>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Conductor</DialogTitle>
            <DialogDescription>
              Create a thermal coupling between two nodes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-6">
            <div className="space-y-2">
              <Label htmlFor="cond-name">Name</Label>
              <Input
                id="cond-name"
                placeholder="e.g., Panel-to-Bus"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-white/5"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={conductorType} onValueChange={(v) => setConductorType(v as Conductor['conductorType'])}>
                <SelectTrigger className="bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear (conduction)</SelectItem>
                  <SelectItem value="radiation">Radiation</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From Node</Label>
                <Select value={nodeFromId} onValueChange={setNodeFromId}>
                  <SelectTrigger className="bg-white/5">
                    <SelectValue placeholder="Select node" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map((node) => (
                      <SelectItem key={node.id} value={node.id} disabled={node.id === nodeToId}>
                        {node.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To Node</Label>
                <Select value={nodeToId} onValueChange={setNodeToId}>
                  <SelectTrigger className="bg-white/5">
                    <SelectValue placeholder="Select node" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map((node) => (
                      <SelectItem key={node.id} value={node.id} disabled={node.id === nodeFromId}>
                        {node.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {conductorType !== 'radiation' && (
              <div className="space-y-2">
                <Label htmlFor="cond-val">Conductance ({label('Conductance')})</Label>
                <Input
                  id="cond-val"
                  type="number"
                  value={conductance}
                  onChange={(e) => setConductance(e.target.value)}
                  required
                  min="0.001"
                  step="0.001"
                  className="bg-white/5"
                />
              </div>
            )}

            {conductorType === 'radiation' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="rad-area">Area ({label('Area')})</Label>
                  <Input
                    id="rad-area"
                    type="number"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    required
                    min="0.0001"
                    step="0.0001"
                    className="bg-white/5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="rad-vf">View Factor</Label>
                    <Input
                      id="rad-vf"
                      type="number"
                      value={viewFactor}
                      onChange={(e) => setViewFactor(e.target.value)}
                      required
                      min="0"
                      max="1"
                      step="0.01"
                      className="bg-white/5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rad-em">Emissivity</Label>
                    <Input
                      id="rad-em"
                      type="number"
                      value={emissivity}
                      onChange={(e) => setEmissivity(e.target.value)}
                      required
                      min="0"
                      max="1"
                      step="0.01"
                      className="bg-white/5"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="glow" disabled={!name.trim() || !nodeFromId || !nodeToId}>
              Add Conductor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
