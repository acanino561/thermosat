'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Search, Database, LayoutGrid, List, GitCompareArrows,
  Plus, Download, Upload, X, CheckSquare, Square, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useEditorStore } from '@/lib/stores/editor-store';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Material {
  id: string;
  name: string;
  category: 'metal' | 'composite' | 'mli' | 'paint' | 'osr' | 'adhesive';
  conductivity: number;
  density: number;
  specificHeat: number;
  emissivity: number;
  absorptivity: number;
  tempRangeMin: number;
  tempRangeMax: number;
  isDefault: boolean;
  projectId?: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['all', 'metal', 'composite', 'mli', 'paint', 'osr', 'adhesive'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  metal:     'text-blue-400 border-blue-400/30 bg-blue-400/10',
  composite: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  mli:       'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
  paint:     'text-green-400 border-green-400/30 bg-green-400/10',
  osr:       'text-amber-400 border-amber-400/30 bg-amber-400/10',
  adhesive:  'text-rose-400 border-rose-400/30 bg-rose-400/10',
};

const COMPARE_COLORS = ['#3b82f6', '#06b6d4', '#a855f7', '#22c55e', '#f97316'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number, decimals = 3): string {
  if (v === 0) return '0';
  if (Math.abs(v) < 0.001) return v.toExponential(2);
  return v.toFixed(decimals);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MaterialCard({ mat, selected, onSelect, onOpen }: {
  mat: Material;
  selected: boolean;
  onSelect: (id: string) => void;
  onOpen: (mat: Material) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn(
        'glass rounded-xl p-4 cursor-pointer border transition-all hover:border-cyan-400/30',
        selected ? 'border-cyan-400/50 bg-cyan-400/5' : 'border-white/10',
      )}
      onClick={() => onOpen(mat)}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{mat.name}</p>
          {!mat.isDefault && (
            <span className="text-[10px] text-muted-foreground">Custom</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className={`text-[9px] capitalize ${CATEGORY_COLORS[mat.category]}`}>
            {mat.category}
          </Badge>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(mat.id); }}
            className="text-muted-foreground hover:text-cyan-400 transition-colors"
            title="Compare"
          >
            {selected ? <CheckSquare className="w-3.5 h-3.5 text-cyan-400" /> : <Square className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">k</span>
          <span className="font-mono">{fmt(mat.conductivity)} W/m·K</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">ε</span>
          <span className="font-mono">{fmt(mat.emissivity, 2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">α</span>
          <span className="font-mono">{fmt(mat.absorptivity, 2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cp</span>
          <span className="font-mono">{fmt(mat.specificHeat, 0)} J/kg·K</span>
        </div>
      </div>
    </motion.div>
  );
}

function MaterialRow({ mat, selected, onSelect, onOpen }: {
  mat: Material;
  selected: boolean;
  onSelect: (id: string) => void;
  onOpen: (mat: Material) => void;
}) {
  return (
    <tr
      className="border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer"
      onClick={() => onOpen(mat)}
    >
      <td className="py-2.5 px-4">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(mat.id); }}
          className="text-muted-foreground hover:text-cyan-400 transition-colors"
        >
          {selected ? <CheckSquare className="w-3.5 h-3.5 text-cyan-400" /> : <Square className="w-3.5 h-3.5" />}
        </button>
      </td>
      <td className="py-2.5 px-4 font-medium text-sm">
        {mat.name}
        {!mat.isDefault && (
          <span className="ml-1.5 text-[10px] text-muted-foreground">(custom)</span>
        )}
      </td>
      <td className="py-2.5 px-4">
        <Badge variant="outline" className={`text-[9px] capitalize ${CATEGORY_COLORS[mat.category]}`}>
          {mat.category}
        </Badge>
      </td>
      <td className="py-2.5 px-4 text-right font-mono text-xs">{fmt(mat.conductivity)}</td>
      <td className="py-2.5 px-4 text-right font-mono text-xs">{fmt(mat.density, 0)}</td>
      <td className="py-2.5 px-4 text-right font-mono text-xs">{fmt(mat.specificHeat, 0)}</td>
      <td className="py-2.5 px-4 text-right font-mono text-xs">{fmt(mat.emissivity, 2)}</td>
      <td className="py-2.5 px-4 text-right font-mono text-xs">{fmt(mat.absorptivity, 2)}</td>
      <td className="py-2.5 px-4 text-right">
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
      </td>
    </tr>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

function MaterialDetailDialog({ mat, onClose }: { mat: Material; onClose: () => void }) {
  const nodes = useEditorStore((s) => s.nodes);
  const updateNode = useEditorStore((s) => s.updateNode);
  const modelId = useEditorStore((s) => s.modelId);
  const [assignNodeId, setAssignNodeId] = useState('');
  const [assigned, setAssigned] = useState(false);

  function handleAssign() {
    if (!assignNodeId) return;
    updateNode(assignNodeId, { materialId: mat.id });
    setAssigned(true);
    setTimeout(() => setAssigned(false), 2000);
  }

  const props = [
    { label: 'Thermal Conductivity', value: `${fmt(mat.conductivity)} W/m·K` },
    { label: 'Density', value: `${fmt(mat.density, 0)} kg/m³` },
    { label: 'Specific Heat', value: `${fmt(mat.specificHeat, 0)} J/kg·K` },
    { label: 'Emissivity (ε)', value: fmt(mat.emissivity, 3) },
    { label: 'Absorptivity (α)', value: fmt(mat.absorptivity, 3) },
    { label: 'Temp Range', value: `${mat.tempRangeMin} – ${mat.tempRangeMax} K` },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0a0a1a] border-white/10">
        <DialogHeader>
          <DialogTitle className="font-heading">{mat.name}</DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`text-[10px] capitalize ${CATEGORY_COLORS[mat.category]}`}>
              {mat.category}
            </Badge>
            {!mat.isDefault && <Badge variant="outline" className="text-[10px]">Custom</Badge>}
          </div>
        </DialogHeader>

        <div className="space-y-1">
          {props.map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="font-mono text-sm">{value}</span>
            </div>
          ))}
        </div>

        {nodes.length > 0 && modelId ? (
          <div className="space-y-2 pt-2">
            <Separator />
            <p className="text-xs text-muted-foreground font-medium">Assign to Node</p>
            <div className="flex gap-2">
              <Select value={assignNodeId} onValueChange={setAssignNodeId}>
                <SelectTrigger className="flex-1 h-8 text-xs bg-white/5 border-white/10">
                  <SelectValue placeholder="Select node..." />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map((n) => (
                    <SelectItem key={n.id} value={n.id} className="text-xs">{n.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAssign} disabled={!assignNodeId} className="text-xs h-8">
                {assigned ? 'Assigned ✓' : 'Assign'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground pt-2 border-t border-white/5">
            Open a model in the editor to assign this material to a node.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Comparison View ───────────────────────────────────────────────────────────

function ComparisonView({ materials: mats, onClose }: { materials: Material[]; onClose: () => void }) {
  const props = ['conductivity', 'density', 'specificHeat', 'emissivity', 'absorptivity'] as const;
  const labels: Record<typeof props[number], string> = {
    conductivity: 'k (W/m·K)',
    density: 'ρ (kg/m³)',
    specificHeat: 'Cp (J/kg·K)',
    emissivity: 'ε',
    absorptivity: 'α',
  };

  const chartData = props.map((prop) => {
    const point: Record<string, number | string> = { prop: labels[prop] };
    mats.forEach((m) => { point[m.name] = m[prop]; });
    return point;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">Comparison</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4 mr-1" /> Close
        </Button>
      </div>

      {/* Side-by-side table */}
      <div className="glass rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Property</th>
              {mats.map((m, i) => (
                <th key={m.id} className="text-right py-3 px-4 font-medium" style={{ color: COMPARE_COLORS[i] }}>
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { key: 'conductivity', label: 'k (W/m·K)' },
              { key: 'density', label: 'ρ (kg/m³)' },
              { key: 'specificHeat', label: 'Cp (J/kg·K)' },
              { key: 'emissivity', label: 'Emissivity ε' },
              { key: 'absorptivity', label: 'Absorptivity α' },
              { key: 'tempRangeMin', label: 'T_min (K)' },
              { key: 'tempRangeMax', label: 'T_max (K)' },
            ].map(({ key, label }) => (
              <tr key={key} className="border-b border-white/5">
                <td className="py-2.5 px-4 text-muted-foreground">{label}</td>
                {mats.map((m) => (
                  <td key={m.id} className="py-2.5 px-4 text-right font-mono text-xs">
                    {fmt((m as any)[key], key === 'conductivity' ? 3 : key === 'density' || key === 'specificHeat' || key === 'tempRangeMin' || key === 'tempRangeMax' ? 0 : 3)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bar chart — optical properties */}
      <div className="glass rounded-xl p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Optical & Thermal Properties</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.filter((d) => ['ε', 'α', 'k (W/m·K)'].includes(d.prop as string))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="prop" tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="rgba(255,255,255,0.1)" />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="rgba(255,255,255,0.1)" />
              <Tooltip
                contentStyle={{ backgroundColor: '#111122', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              {mats.map((m, i) => (
                <Bar key={m.id} dataKey={m.name} fill={COMPARE_COLORS[i]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── New Material Dialog ───────────────────────────────────────────────────────

function NewMaterialDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (mat: Material) => void }) {
  const projectId = useEditorStore((s) => s.projectId);
  const [form, setForm] = useState({
    name: '', category: 'metal' as Material['category'],
    conductivity: '', density: '', specificHeat: '',
    emissivity: '', absorptivity: '', tempRangeMin: '0', tempRangeMax: '400',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name,
        category: form.category,
        conductivity: parseFloat(form.conductivity),
        density: parseFloat(form.density),
        specificHeat: parseFloat(form.specificHeat),
        emissivity: parseFloat(form.emissivity),
        absorptivity: parseFloat(form.absorptivity),
        tempRangeMin: parseFloat(form.tempRangeMin),
        tempRangeMax: parseFloat(form.tempRangeMax),
        ...(projectId ? { projectId } : {}),
      };
      const res = await fetch('/api/materials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); return; }
      const { material } = await res.json();
      onCreated(material);
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="h-8 text-xs bg-white/5 border-white/10"
      />
    </div>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-[#0a0a1a] border-white/10">
        <DialogHeader>
          <DialogTitle className="font-heading">New Material</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-8 text-xs bg-white/5 border-white/10" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as Material['category'] }))}>
              <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['metal', 'composite', 'mli', 'paint', 'osr', 'adhesive'].map((c) => (
                  <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {field('conductivity', 'Conductivity (W/m·K)', 'number')}
          {field('density', 'Density (kg/m³)', 'number')}
          {field('specificHeat', 'Specific Heat (J/kg·K)', 'number')}
          {field('emissivity', 'Emissivity ε (0–1)', 'number')}
          {field('absorptivity', 'Absorptivity α (0–1)', 'number')}
          {field('tempRangeMin', 'T_min (K)', 'number')}
          {field('tempRangeMax', 'T_max (K)', 'number')}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving || !form.name} className="text-xs">
            {saving ? 'Saving...' : 'Create Material'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MaterialsPage() {
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [comparing, setComparing] = useState(false);
  const [detailMat, setDetailMat] = useState<Material | null>(null);
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/materials')
      .then((r) => r.json())
      .then((d) => setAllMaterials(d.materials ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return allMaterials.filter((m) => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === 'all' || m.category === category;
      return matchSearch && matchCat;
    });
  }, [allMaterials, search, category]);

  const compareList = useMemo(
    () => allMaterials.filter((m) => compareIds.has(m.id)),
    [allMaterials, compareIds],
  );

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else if (next.size < 5) { next.add(id); }
      return next;
    });
  }

  function handleExport() {
    const custom = allMaterials.filter((m) => !m.isDefault);
    const blob = new Blob([JSON.stringify(custom, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'verixos-custom-materials.json'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as any[];
      const created: Material[] = [];
      for (const mat of data) {
        const res = await fetch('/api/materials', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mat),
        });
        if (res.ok) { const { material } = await res.json(); created.push(material); }
      }
      setAllMaterials((prev) => [...prev, ...created]);
    } catch {
      console.error('Import failed');
    }
    if (importRef.current) importRef.current.value = '';
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold mb-1">Materials Database</h1>
            <p className="text-muted-foreground">Thermal properties for spacecraft materials.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleExport} className="text-xs h-8 gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export Custom
            </Button>
            <Button variant="ghost" size="sm" onClick={() => importRef.current?.click()} className="text-xs h-8 gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <Button size="sm" onClick={() => setShowNewMaterial(true)} className="text-xs h-8 gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Material
            </Button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {comparing ? (
          <motion.div key="compare" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ComparisonView materials={compareList} onClose={() => setComparing(false)} />
          </motion.div>
        ) : (
          <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search materials..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-9 bg-white/5 border-white/10"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[140px] h-9 text-xs bg-white/5 border-white/10">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center rounded-lg border border-white/10 overflow-hidden">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn('p-2 transition-colors', viewMode === 'table' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white')}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              {compareIds.size > 0 && (
                <Button
                  size="sm"
                  onClick={() => setComparing(true)}
                  disabled={compareIds.size < 2}
                  className="h-9 text-xs gap-1.5"
                >
                  <GitCompareArrows className="w-3.5 h-3.5" />
                  Compare ({compareIds.size})
                </Button>
              )}
              {compareIds.size > 0 && (
                <button onClick={() => setCompareIds(new Set())} className="text-xs text-muted-foreground hover:text-white transition-colors">
                  Clear
                </button>
              )}
            </div>

            {/* Count */}
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-400" />
              <span className="text-sm text-muted-foreground">
                {loading ? 'Loading...' : `${filtered.length} material${filtered.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {/* Grid view */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                <AnimatePresence>
                  {filtered.map((mat) => (
                    <MaterialCard
                      key={mat.id}
                      mat={mat}
                      selected={compareIds.has(mat.id)}
                      onSelect={toggleCompare}
                      onOpen={setDetailMat}
                    />
                  ))}
                </AnimatePresence>
                {filtered.length === 0 && !loading && (
                  <p className="col-span-full text-center text-muted-foreground py-12">No materials found.</p>
                )}
              </div>
            )}

            {/* Table view */}
            {viewMode === 'table' && (
              <div className="glass rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-muted-foreground">
                        <th className="py-3 px-4 w-8"></th>
                        <th className="text-left py-3 px-4 font-medium">Material</th>
                        <th className="text-left py-3 px-4 font-medium">Category</th>
                        <th className="text-right py-3 px-4 font-medium">k (W/m·K)</th>
                        <th className="text-right py-3 px-4 font-medium">ρ (kg/m³)</th>
                        <th className="text-right py-3 px-4 font-medium">Cp (J/kg·K)</th>
                        <th className="text-right py-3 px-4 font-medium">ε</th>
                        <th className="text-right py-3 px-4 font-medium">α</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((mat) => (
                        <MaterialRow
                          key={mat.id}
                          mat={mat}
                          selected={compareIds.has(mat.id)}
                          onSelect={toggleCompare}
                          onOpen={setDetailMat}
                        />
                      ))}
                      {filtered.length === 0 && !loading && (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-muted-foreground">
                            No materials found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail panel */}
      {detailMat && <MaterialDetailDialog mat={detailMat} onClose={() => setDetailMat(null)} />}

      {/* New material */}
      {showNewMaterial && (
        <NewMaterialDialog
          onClose={() => setShowNewMaterial(false)}
          onCreated={(mat) => setAllMaterials((prev) => [...prev, mat])}
        />
      )}
    </div>
  );
}
