'use client';

import { useEffect, useState, useCallback } from 'react';
import { ApiKeyList } from '@/components/dashboard/api-key-list';
import { CreateApiKeyDialog } from '@/components/dashboard/create-api-key-dialog';

interface ApiKey {
  id: string;
  label: string;
  keyHint: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/api-keys');
      if (!res.ok) return;
      const json = await res.json();
      setKeys(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleRevoke = async (id: string) => {
    const res = await fetch(`/api/v1/api-keys/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchKeys();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Keys</h2>
          <p className="text-muted-foreground">
            Manage API keys for programmatic access to the Verixos API.
          </p>
        </div>
        <CreateApiKeyDialog onCreated={fetchKeys} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <ApiKeyList keys={keys} onRevoke={handleRevoke} />
      )}
    </div>
  );
}
