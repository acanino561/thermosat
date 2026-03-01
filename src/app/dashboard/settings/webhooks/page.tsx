'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, Eye, Copy, Loader2 } from 'lucide-react';
import Link from 'next/link';

const EVENT_TYPES = [
  'simulation.completed',
  'simulation.failed',
  'model.updated',
  'review.status_changed',
  'member.joined',
  'failure_analysis.completed',
  'design_exploration.completed',
] as const;

interface Webhook {
  id: string;
  url: string;
  label: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

export default function WebhooksSettingsPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [generatedSecret, setGeneratedSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/webhooks');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const generateSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const secret = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
    setGeneratedSecret(secret);
    setShowSecret(true);
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(generatedSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const createWebhook = async () => {
    if (!newUrl || !newLabel || !generatedSecret || newEvents.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newUrl,
          label: newLabel,
          events: newEvents,
          secret: generatedSecret,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setNewUrl('');
        setNewLabel('');
        setNewEvents([]);
        setGeneratedSecret('');
        setShowSecret(false);
        fetchWebhooks();
      }
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await fetch(`/api/webhooks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    setWebhooks((prev) =>
      prev.map((wh) => (wh.id === id ? { ...wh, active } : wh)),
    );
  };

  const deleteWebhook = async (id: string) => {
    await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
    setWebhooks((prev) => prev.filter((wh) => wh.id !== id));
  };

  const toggleEvent = (event: string) => {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Webhooks</h2>
          <p className="text-muted-foreground">
            Receive HTTP notifications when events occur in your projects.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="wh-label">Label</Label>
                <Input
                  id="wh-label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="My webhook"
                />
              </div>
              <div>
                <Label htmlFor="wh-url">URL</Label>
                <Input
                  id="wh-url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                />
              </div>
              <div>
                <Label>Events</Label>
                <div className="mt-2 space-y-2">
                  {EVENT_TYPES.map((event) => (
                    <div key={event} className="flex items-center gap-2">
                      <Checkbox
                        id={`event-${event}`}
                        checked={newEvents.includes(event)}
                        onCheckedChange={() => toggleEvent(event)}
                      />
                      <label htmlFor={`event-${event}`} className="text-sm">
                        {event}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Signing Secret</Label>
                {!showSecret ? (
                  <Button variant="outline" className="mt-1 w-full" onClick={generateSecret}>
                    Generate Secret
                  </Button>
                ) : (
                  <div className="mt-1 flex gap-2">
                    <Input value={generatedSecret} readOnly className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={copySecret}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {secretCopied && (
                  <p className="mt-1 text-xs text-green-600">Copied!</p>
                )}
                {showSecret && (
                  <p className="mt-1 text-xs text-amber-600">
                    Save this secret now — it won&apos;t be shown again.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createWebhook} disabled={creating || !newUrl || !newLabel || !generatedSecret || newEvents.length === 0}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No webhooks configured yet. Add one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <Card key={wh.id}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{wh.label}</CardTitle>
                  <p className="text-sm text-muted-foreground truncate">{wh.url}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={wh.active}
                    onCheckedChange={(val) => toggleActive(wh.id, val)}
                  />
                  <Link href={`/dashboard/settings/webhooks/${wh.id}/deliveries`}>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteWebhook(wh.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <div className="flex flex-wrap gap-1">
                  {(wh.events as string[]).map((evt) => (
                    <Badge key={evt} variant="secondary" className="text-xs">
                      {evt}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
