'use client';

import { useUnits } from '@/lib/hooks/use-units';

interface ResultsTableProps {
  nodeResults: Record<string, { times: number[]; temperatures: number[] }>;
  nodeNames: Record<string, string>;
}

export function ResultsTable({ nodeResults, nodeNames }: ResultsTableProps) {
  const { label, display } = useUnits();
  const tempLabel = label('Temperature');

  const rows = Object.entries(nodeResults).map(([nodeId, data]) => {
    const temps = data.temperatures;
    return {
      nodeId,
      name: nodeNames[nodeId] || nodeId,
      min: display(Math.min(...temps), 'Temperature'),
      max: display(Math.max(...temps), 'Temperature'),
      initial: display(temps[0], 'Temperature'),
      final: display(temps[temps.length - 1], 'Temperature'),
      delta: display(temps[temps.length - 1], 'Temperature') - display(temps[0], 'Temperature'),
    };
  });

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="font-heading text-lg font-semibold mb-4">Temperature Summary</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Node</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">T_min ({tempLabel})</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">T_max ({tempLabel})</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">T_initial ({tempLabel})</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">T_final ({tempLabel})</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">ΔT ({tempLabel})</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.nodeId} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="py-2 px-3 font-medium">{row.name}</td>
                <td className="py-2 px-3 text-right font-mono text-accent-cyan">{row.min.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono text-accent-orange">{row.max.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono">{row.initial.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono">{row.final.toFixed(2)}</td>
                <td className={`py-2 px-3 text-right font-mono ${row.delta > 0 ? 'text-accent-orange' : 'text-accent-cyan'}`}>
                  {row.delta > 0 ? '+' : ''}{row.delta.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
