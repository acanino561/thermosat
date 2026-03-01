'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Link2, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareLink {
  id: string;
  modelId: string;
  token: string;
  permission: string;
  expiresAt: string | null;
  revokedAt?: string | null;
  accessCount?: number;
  createdAt: string;
}

interface ShareDialogProps {
  modelId: string;
  trigger: React.ReactNode;
}

function getExpiryDate(option: string): string | undefined {
  if (option === 'never') return undefined;
  const now = new Date();
  const hours: Record<string, number> = { '24h': 24, '7d': 168, '30d': 720 };
  now.setHours(now.getHours() + (hours[option] ?? 0));
  return now.toISOString();
}

export function ShareDialog({ modelId, trigger }: ShareDialogProps) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [permission, setPermission] = useState('view');
  const [expiry, setExpiry] = useState('never');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/models/${modelId}/share`);
      if (res.ok) {
        const json = await res.json();
        setLinks(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedUrl(null);
    try {
      const res = await fetch(`/api/models/${modelId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permission,
          expiresAt: getExpiryDate(expiry),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const shareUrl = `${window.location.origin}${json.data.shareUrl}`;
        setGeneratedUrl(shareUrl);
        await fetchLinks();
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (linkId: string) => {
    const res = await fetch(`/api/models/${modelId}/share/${linkId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await fetchLinks();
    }
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Share Model</DialogTitle>
        </DialogHeader>

        {/* Create Share Link */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white/70">Create Share Link</h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-white/60">Permission</Label>
              <Select value={permission} onValueChange={setPermission}>
                <SelectTrigger className="h-8 text-sm bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View only</SelectItem>
                  <SelectItem value="edit">Can edit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-white/60">Expiry</Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger className="h-8 text-sm bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="24h">24 hours</SelectItem>
                  <SelectItem value="7d">7 days</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            variant="glow-orange"
            size="sm"
            className="w-full gap-2"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            Generate Link
          </Button>

          {generatedUrl && (
            <div className="flex gap-2">
              <Input
                readOnly
                value={generatedUrl}
                className="h-8 text-xs bg-white/5 border-white/10"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              {copied && <span className="text-[10px] text-green-400 self-center">Copied!</span>}
            </div>
          )}
        </div>

        {/* Active Links */}
        <div className="space-y-2 mt-4">
          <h4 className="text-sm font-medium text-white/70">Active Links</h4>
          {loading ? (
            <p className="text-xs text-white/40">Loading…</p>
          ) : links.length === 0 ? (
            <p className="text-xs text-white/40">No share links yet</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {links.map((link) => {
                const isRevoked = !!link.revokedAt;
                return (
                  <div
                    key={link.id}
                    className={cn(
                      'flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] p-2',
                      isRevoked && 'line-through opacity-50',
                    )}
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        link.permission === 'edit'
                          ? 'text-blue-400 border-blue-400/40'
                          : 'text-white/60 border-white/20',
                      )}
                    >
                      {link.permission === 'edit' ? 'Edit' : 'View'}
                    </Badge>
                    <span className="text-[10px] text-white/40 truncate flex-1">
                      {link.expiresAt
                        ? `Expires ${new Date(link.expiresAt).toLocaleDateString()}`
                        : 'No expiry'}
                    </span>
                    {typeof link.accessCount === 'number' && (
                      <span className="text-[10px] text-white/30">{link.accessCount} views</span>
                    )}
                    {!isRevoked && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white/40 hover:text-red-400"
                        onClick={() => handleRevoke(link.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
