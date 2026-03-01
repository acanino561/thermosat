'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Copy } from 'lucide-react';

interface ApiKey {
  id: string;
  label: string;
  keyHint: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

function getStatus(key: ApiKey): { label: string; variant: 'default' | 'destructive' | 'secondary' } {
  if (key.revokedAt) return { label: 'Revoked', variant: 'destructive' };
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) return { label: 'Expired', variant: 'secondary' };
  return { label: 'Active', variant: 'default' };
}

export function ApiKeyList({
  keys,
  onRevoke,
}: {
  keys: ApiKey[];
  onRevoke: (id: string) => Promise<void>;
}) {
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await onRevoke(id);
    } finally {
      setRevoking(null);
    }
  };

  if (keys.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No API keys yet. Generate one to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {keys.map((key) => {
        const status = getStatus(key);
        return (
          <div
            key={key.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{key.label}</span>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <div className="text-sm text-muted-foreground font-mono">
                vx_live_...{key.keyHint}
              </div>
              <div className="text-xs text-muted-foreground">
                Created {new Date(key.createdAt).toLocaleDateString()}
                {key.lastUsedAt && (
                  <> · Last used {new Date(key.lastUsedAt).toLocaleDateString()}</>
                )}
                {key.expiresAt && (
                  <> · Expires {new Date(key.expiresAt).toLocaleDateString()}</>
                )}
              </div>
            </div>
            {status.label === 'Active' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRevoke(key.id)}
                disabled={revoking === key.id}
              >
                {revoking === key.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span className="ml-1">Revoke</span>
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
