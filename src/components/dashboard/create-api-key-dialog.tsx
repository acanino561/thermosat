'use client';

import { useState } from 'react';
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
import { Copy, Plus, AlertTriangle } from 'lucide-react';

export function CreateApiKeyDialog({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!label.trim()) return;
    setLoading(true);
    try {
      const body: Record<string, string> = { label: label.trim() };
      if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();

      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to create API key');

      const json = await res.json();
      setPlaintext(json.data.plaintext);
    } catch {
      // TODO: toast
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!plaintext) return;
    await navigator.clipboard.writeText(plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Reset state on close
      setLabel('');
      setExpiresAt('');
      setPlaintext(null);
      setCopied(false);
      if (plaintext) onCreated(); // refresh list only if key was created
    }
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          Generate New Key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {plaintext ? 'API Key Created' : 'Generate New API Key'}
          </DialogTitle>
        </DialogHeader>

        {plaintext ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 p-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-200">
                Save this key — it will never be shown again.
              </p>
            </div>
            <div className="relative">
              <pre className="rounded-md bg-muted p-3 text-sm font-mono break-all whitespace-pre-wrap">
                {plaintext}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
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
              <Label htmlFor="key-label">Label</Label>
              <Input
                id="key-label"
                placeholder="e.g. CI/CD Pipeline"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-expiry">Expiry Date (optional)</Label>
              <Input
                id="key-expiry"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={loading || !label.trim()}
            >
              {loading ? 'Generating...' : 'Generate Key'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
