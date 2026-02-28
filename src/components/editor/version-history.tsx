'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  RotateCcw,
  Clock,
  Loader2,
} from 'lucide-react';
import { useEditorStore } from '@/lib/stores/editor-store';
import { cn } from '@/lib/utils';

interface Snapshot {
  id: string;
  version: number;
  description: string;
  createdAt: string;
}

interface VersionHistoryProps {
  onClose: () => void;
}

export function VersionHistory({ onClose }: VersionHistoryProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  const projectId = useEditorStore((s) => s.projectId);
  const modelId = useEditorStore((s) => s.modelId);
  const createSnapshot = useEditorStore((s) => s.createSnapshot);

  const fetchSnapshots = useCallback(async () => {
    if (!projectId || !modelId) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/models/${modelId}/snapshots`,
      );
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data);
      }
    } catch (err) {
      console.error('Failed to fetch snapshots:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, modelId]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const handleRestore = async (snapshotId: string) => {
    if (!projectId || !modelId) return;
    setRestoring(snapshotId);

    try {
      // 1. Create safety snapshot of current state
      await createSnapshot('Safety snapshot before restore');

      // 2. Fetch the full snapshot data
      const res = await fetch(
        `/api/projects/${projectId}/models/${modelId}/snapshots/${snapshotId}`,
      );
      if (!res.ok) throw new Error('Failed to fetch snapshot');
      const snapshot = await res.json();

      // 3. Load snapshot data into the editor store
      const store = useEditorStore.getState();
      const data = snapshot.snapshot;
      if (data) {
        useEditorStore.setState({
          nodes: data.nodes || [],
          conductors: data.conductors || [],
          heatLoads: data.heatLoads || [],
          isDirty: true,
        });
        store.pushHistory(`Restored version ${snapshot.version}`);
        store._scheduleAutoSave();
      }

      // 4. Refresh snapshots list
      await fetchSnapshots();
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
    } finally {
      setRestoring(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const descriptionBadgeColor = (desc: string) => {
    if (desc.includes('Pre-simulation')) return 'text-orange-400 border-orange-400/30';
    if (desc.includes('Manual')) return 'text-cyan-400 border-cyan-400/30';
    if (desc.includes('Safety')) return 'text-yellow-400 border-yellow-400/30';
    if (desc.includes('Periodic')) return 'text-purple-400 border-purple-400/30';
    return 'text-muted-foreground border-white/10';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="absolute right-0 top-0 bottom-0 w-80 z-40 border-l border-white/10 bg-space-surface/95 backdrop-blur-md flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent-cyan" />
          <span className="text-sm font-heading font-semibold">Version History</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Snapshot list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : snapshots.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 text-center py-8">
              No snapshots yet. Changes are saved automatically.
            </p>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                className="group rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0 shrink-0',
                          descriptionBadgeColor(snap.description),
                        )}
                      >
                        v{snap.version}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground/50">
                        {formatTime(snap.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {snap.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => handleRestore(snap.id)}
                    disabled={restoring !== null}
                  >
                    {restoring === snap.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
