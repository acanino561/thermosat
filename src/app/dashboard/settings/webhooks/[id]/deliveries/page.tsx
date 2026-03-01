'use client';

import { useEffect, useState, use } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Delivery {
  id: string;
  eventType: string;
  status: string;
  attempts: number;
  httpStatus: number | null;
  responseBody: string | null;
  createdAt: string;
  lastAttemptAt: string | null;
}

export default function DeliveriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/webhooks/${id}/deliveries?page=${page}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setDeliveries(data.deliveries);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, page]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings/webhooks">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">Delivery Log</h2>
          <p className="text-muted-foreground">Recent webhook deliveries</p>
        </div>
      </div>

      {deliveries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No deliveries yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {deliveries.map((d) => (
            <Card key={d.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={statusColor(d.status)}>{d.status}</Badge>
                    <span className="text-sm font-medium">{d.eventType}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {d.httpStatus !== null && <span>HTTP {d.httpStatus}</span>}
                    <span>Attempts: {d.attempts}</span>
                    <span>{new Date(d.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                {d.responseBody && (
                  <pre className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded max-h-20 overflow-auto">
                    {d.responseBody}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={deliveries.length < 20}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
