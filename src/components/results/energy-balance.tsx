'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface EnergyBalanceProps {
  error?: number;
}

export function EnergyBalance({ error }: EnergyBalanceProps) {
  const errorPercent = error != null ? error * 100 : null;
  const isAcceptable = errorPercent != null && Math.abs(errorPercent) < 1;

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="font-heading text-lg font-semibold mb-4">Energy Balance Check</h3>
      <div className="flex items-center gap-4">
        {isAcceptable ? (
          <div className="p-3 rounded-lg bg-green-400/10">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-yellow-400/10">
            <AlertTriangle className="h-8 w-8 text-yellow-400" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-semibold text-lg">
              {errorPercent != null ? `${errorPercent.toFixed(4)}%` : 'N/A'}
            </span>
            <Badge variant={isAcceptable ? 'cyan' : 'orange'}>
              {isAcceptable ? 'Pass' : 'Warning'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isAcceptable
              ? 'Energy balance error is within acceptable limits (< 1%).'
              : 'Energy balance error exceeds 1%. Consider using a smaller time step.'}
          </p>
        </div>
      </div>
    </div>
  );
}
