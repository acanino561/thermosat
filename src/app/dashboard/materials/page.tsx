'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Database } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  category: 'metal' | 'composite' | 'ceramic' | 'coating' | 'insulation';
  conductivity: number;
  density: number;
  specificHeat: number;
  emissivity: number;
  absorptivity: number;
}

const materials: Material[] = [
  { id: '1', name: 'Aluminum 6061-T6', category: 'metal', conductivity: 167, density: 2700, specificHeat: 896, emissivity: 0.09, absorptivity: 0.15 },
  { id: '2', name: 'Aluminum 7075-T6', category: 'metal', conductivity: 130, density: 2810, specificHeat: 960, emissivity: 0.10, absorptivity: 0.15 },
  { id: '3', name: 'Titanium Ti-6Al-4V', category: 'metal', conductivity: 6.7, density: 4430, specificHeat: 526, emissivity: 0.30, absorptivity: 0.50 },
  { id: '4', name: 'Stainless Steel 304', category: 'metal', conductivity: 14.9, density: 8000, specificHeat: 500, emissivity: 0.60, absorptivity: 0.55 },
  { id: '5', name: 'Copper C110', category: 'metal', conductivity: 388, density: 8940, specificHeat: 385, emissivity: 0.05, absorptivity: 0.35 },
  { id: '6', name: 'CFRP (Quasi-iso)', category: 'composite', conductivity: 5.0, density: 1600, specificHeat: 800, emissivity: 0.85, absorptivity: 0.92 },
  { id: '7', name: 'Honeycomb Al Core', category: 'composite', conductivity: 2.5, density: 640, specificHeat: 900, emissivity: 0.12, absorptivity: 0.20 },
  { id: '8', name: 'Kevlar 49', category: 'composite', conductivity: 0.04, density: 1440, specificHeat: 1420, emissivity: 0.90, absorptivity: 0.88 },
  { id: '9', name: 'Alumina (Al₂O₃)', category: 'ceramic', conductivity: 35, density: 3950, specificHeat: 775, emissivity: 0.80, absorptivity: 0.30 },
  { id: '10', name: 'Fused Silica', category: 'ceramic', conductivity: 1.38, density: 2200, specificHeat: 740, emissivity: 0.75, absorptivity: 0.10 },
  { id: '11', name: 'White Paint (S13G)', category: 'coating', conductivity: 0.2, density: 1200, specificHeat: 1000, emissivity: 0.90, absorptivity: 0.20 },
  { id: '12', name: 'Black Paint (Z306)', category: 'coating', conductivity: 0.2, density: 1100, specificHeat: 1000, emissivity: 0.95, absorptivity: 0.95 },
  { id: '13', name: 'OSR (Optical Solar Reflector)', category: 'coating', conductivity: 1.0, density: 2500, specificHeat: 800, emissivity: 0.80, absorptivity: 0.08 },
  { id: '14', name: 'MLI Blanket (10-layer)', category: 'insulation', conductivity: 0.001, density: 50, specificHeat: 1000, emissivity: 0.03, absorptivity: 0.14 },
  { id: '15', name: 'Aerogel', category: 'insulation', conductivity: 0.015, density: 150, specificHeat: 1000, emissivity: 0.10, absorptivity: 0.15 },
];

const categories = ['all', 'metal', 'composite', 'ceramic', 'coating', 'insulation'] as const;

const categoryColors: Record<string, string> = {
  metal: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  composite: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  ceramic: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  coating: 'text-green-400 border-green-400/30 bg-green-400/10',
  insulation: 'text-rose-400 border-rose-400/30 bg-rose-400/10',
};

export default function MaterialsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === 'all' || m.category === category;
      return matchSearch && matchCategory;
    });
  }, [search, category]);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="font-heading text-3xl font-bold mb-1">Materials Database</h1>
        <p className="text-muted-foreground">
          Browse and search thermal properties for spacecraft materials.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search materials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10"
            />
          </div>
          <Tabs value={category} onValueChange={setCategory}>
            <TabsList className="bg-white/5">
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="text-xs capitalize">
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-400" />
              <CardTitle className="font-heading text-lg">
                {filtered.length} Material{filtered.length !== 1 ? 's' : ''}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">Material</th>
                    <th className="text-left py-3 px-4 font-medium">Category</th>
                    <th className="text-right py-3 px-4 font-medium">k (W/m·K)</th>
                    <th className="text-right py-3 px-4 font-medium">ρ (kg/m³)</th>
                    <th className="text-right py-3 px-4 font-medium">Cp (J/kg·K)</th>
                    <th className="text-right py-3 px-4 font-medium">ε</th>
                    <th className="text-right py-3 px-4 font-medium">α</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((mat, i) => (
                    <motion.tr
                      key={mat.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-medium">{mat.name}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={`text-[10px] capitalize ${categoryColors[mat.category]}`}>
                          {mat.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs">{mat.conductivity}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs">{mat.density}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs">{mat.specificHeat}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs">{mat.emissivity.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs">{mat.absorptivity.toFixed(2)}</td>
                    </motion.tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        No materials found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
