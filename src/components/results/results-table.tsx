'use client';

interface ResultsTableProps {
  nodeResults: Record<string, { times: number[]; temperatures: number[] }>;
  nodeNames: Record<string, string>;
}

export function ResultsTable({ nodeResults, nodeNames }: ResultsTableProps) {
  const rows = Object.entries(nodeResults).map(([nodeId, data]) => {
    const temps = data.temperatures;
    return {
      nodeId,
      name: nodeNames[nodeId] || nodeId,
      min: Math.min(...temps),
      max: Math.max(...temps),
      initial: temps[0],
      final: temps[temps.length - 1],
      delta: temps[temps.length - 1] - temps[0],
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
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">T_min (K)</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">T_max (K)</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">T_initial (K)</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">T_final (K)</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">ΔT (K)</th>
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
