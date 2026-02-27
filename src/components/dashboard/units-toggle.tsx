'use client';

import { useEffect } from 'react';
import { useUnitsStore } from '@/lib/stores/units-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Ruler } from 'lucide-react';

export function UnitsToggle() {
  const { unitSystem, tempUnit, setUnitSystem, setTempUnit, loadFromProfile } = useUnitsStore();

  useEffect(() => {
    loadFromProfile();
  }, [loadFromProfile]);

  return (
    <div className="flex items-center gap-2">
      <Ruler className="h-4 w-4 text-muted-foreground" />
      <Select value={unitSystem} onValueChange={(v) => setUnitSystem(v as 'SI' | 'Imperial')}>
        <SelectTrigger className="h-8 w-[110px] bg-white/5 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="SI">SI (metric)</SelectItem>
          <SelectItem value="Imperial">Imperial</SelectItem>
        </SelectContent>
      </Select>
      {unitSystem === 'SI' && (
        <Select value={tempUnit} onValueChange={(v) => setTempUnit(v as 'K' | 'C' | 'F')}>
          <SelectTrigger className="h-8 w-[70px] bg-white/5 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="K">K</SelectItem>
            <SelectItem value="C">°C</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
