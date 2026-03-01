'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

interface Delivery {
  id: string;
  timestamp: string;
  eventType: string;
  status: 'success' | 'failed' | 'pending';
  httpStatus: number | null;
  attempts: number;
  response: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

export default function DeliveriesPage() {
  const params = useParams<{ id: string }>();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeliveries = useCallback(async () => {
    try {
      const res = await fetch(`/api/webhooks/${params.id}/deliveries`);
      if (!res.ok) return;
      const json = await res.json();
      setDeliveries(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings/webhooks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Delivery Log</h2>
          <p className="text-muted-foreground">
            Recent webhook delivery attempts.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : deliveries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deliveries yet.</p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Timestamp</th>
                <th className="p-3 text-left font-medium">Event Type</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">HTTP Status</th>
                <th className="p-3 text-left font-medium">Attempts</th>
                <th className="p-3 text-left font-medium">Response</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="p-3 text-muted-foreground">
                    {new Date(d.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary" className="text-xs">
                      {d.eventType}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge className={STATUS_STYLES[d.status] ?? ''}>
                      {d.status}
                    </Badge>
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {d.httpStatus ?? '—'}
                  </td>
                  <td className="p-3">{d.attempts}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {d.response ? d.response.slice(0, 100) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
