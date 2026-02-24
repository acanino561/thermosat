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
import { Flame } from 'lucide-react';
import { useEditorStore } from '@/lib/stores/editor-store';
import type { HeatLoad } from '@/lib/stores/editor-store';

export function AddHeatLoadDialog() {
  const [open, setOpen] = useState(false);
  const nodes = useEditorStore((s) => s.nodes);
  const addHeatLoad = useEditorStore((s) => s.addHeatLoad);

  const [name, setName] = useState('');
  const [loadType, setLoadType] = useState<HeatLoad['loadType']>('constant');
  const [nodeId, setNodeId] = useState('');
  const [value, setValue] = useState('10');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addHeatLoad({
      name,
      nodeId,
      loadType,
      value: loadType === 'constant' ? parseFloat(value) : null,
    });
    setOpen(false);
    setName('');
    setNodeId('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5" disabled={nodes.length < 1}>
              <Flame className="h-3.5 w-3.5" />
              Heat Load
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Add heat load to a node</TooltipContent>
      </Tooltip>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Heat Load</DialogTitle>
            <DialogDescription>
              Apply a heat source or sink to a thermal node.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-6">
            <div className="space-y-2">
              <Label htmlFor="hl-name">Name</Label>
              <Input
                id="hl-name"
                placeholder="e.g., Electronics Waste Heat"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-white/5"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Node</Label>
              <Select value={nodeId} onValueChange={setNodeId}>
                <SelectTrigger className="bg-white/5">
                  <SelectValue placeholder="Select node" />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Load Type</Label>
              <Select value={loadType} onValueChange={(v) => setLoadType(v as HeatLoad['loadType'])}>
                <SelectTrigger className="bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="constant">Constant</SelectItem>
                  <SelectItem value="time_varying">Time-Varying</SelectItem>
                  <SelectItem value="orbital">Orbital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loadType === 'constant' && (
              <div className="space-y-2">
                <Label htmlFor="hl-value">Power (W)</Label>
                <Input
                  id="hl-value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
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
            <Button type="submit" variant="glow" disabled={!name.trim() || !nodeId}>
              Add Heat Load
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
