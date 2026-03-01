'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Plus, AlertTriangle, Trash2 } from 'lucide-react';

interface Webhook {
  id: string;
  label: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

const EVENT_TYPES = [
  'simulation.completed',
  'simulation.failed',
  'model.updated',
  'review.status_changed',
  'member.joined',
  'failure_analysis.completed',
  'design_exploration.completed',
] as const;

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/webhooks');
      if (!res.ok) return;
      const json = await res.json();
      setWebhooks(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleToggle = async (id: string, current: boolean) => {
    const res = await fetch(`/api/webhooks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !current }),
    });
    if (res.ok) await fetchWebhooks();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
    if (res.ok) await fetchWebhooks();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Webhooks</h2>
          <p className="text-muted-foreground">
            Manage webhooks to receive event notifications from Verixos.
          </p>
        </div>
        <CreateWebhookDialog onCreated={fetchWebhooks} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : webhooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No webhooks configured yet.</p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Label</th>
                <th className="p-3 text-left font-medium">URL</th>
                <th className="p-3 text-left font-medium">Events</th>
                <th className="p-3 text-left font-medium">Active</th>
                <th className="p-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((wh) => (
                <tr key={wh.id} className="border-b last:border-0">
                  <td className="p-3">
                    <Link
                      href={`/dashboard/settings/webhooks/${wh.id}/deliveries`}
                      className="font-medium hover:underline"
                    >
                      {wh.label}
                    </Link>
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {wh.url.length > 40 ? `${wh.url.slice(0, 40)}…` : wh.url}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {wh.events.map((evt) => (
                        <Badge key={evt} variant="secondary" className="text-xs">
                          {evt}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <Switch
                      checked={wh.active}
                      onCheckedChange={() => handleToggle(wh.id, wh.active)}
                    />
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(wh.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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

function CreateWebhookDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleEvent = (evt: string) => {
    setSelectedEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt],
    );
  };

  const handleSubmit = async () => {
    if (!url.trim() || !label.trim() || selectedEvents.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          label: label.trim(),
          events: selectedEvents,
          secret: crypto.randomUUID(),
        }),
      });
      if (!res.ok) throw new Error('Failed to create webhook');
      const json = await res.json();
      setSecret(json.data.secret);
    } catch {
      // TODO: toast
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setUrl('');
      setLabel('');
      setSelectedEvents([]);
      setSecret(null);
      setCopied(false);
      if (secret) onCreated();
    }
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          Add Webhook
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {secret ? 'Webhook Created' : 'Add Webhook'}
          </DialogTitle>
        </DialogHeader>

        {secret ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 p-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-200">
                Save this secret — it won&apos;t be shown again.
              </p>
            </div>
            <div className="relative">
              <Input readOnly value={secret} className="pr-20 font-mono text-sm" />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1"
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4" />
                <span className="ml-1">{copied ? 'Copied!' : 'Copy'}</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wh-label">Label</Label>
              <Input
                id="wh-label"
                placeholder="e.g. Slack Notifications"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-url">URL</Label>
              <Input
                id="wh-url"
                placeholder="https://example.com/webhook"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Event Types</Label>
              <div className="grid gap-2">
                {EVENT_TYPES.map((evt) => (
                  <div key={evt} className="flex items-center gap-2">
                    <Checkbox
                      id={`evt-${evt}`}
                      checked={selectedEvents.includes(evt)}
                      onCheckedChange={() => toggleEvent(evt)}
                    />
                    <Label htmlFor={`evt-${evt}`} className="text-sm font-normal cursor-pointer">
                      {evt}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={loading || !url.trim() || !label.trim() || selectedEvents.length === 0}
            >
              {loading ? 'Creating...' : 'Create Webhook'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
