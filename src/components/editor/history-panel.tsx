'use client';

import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useEditorStore } from '@/lib/stores/editor-store';
import { cn } from '@/lib/utils';

interface HistoryPanelProps {
  onClose: () => void;
}

export function HistoryPanel({ onClose }: HistoryPanelProps) {
  const history = useEditorStore((s) => s.history);
  const historyIndex = useEditorStore((s) => s.historyIndex);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-b border-white/10 bg-space-surface/80 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between px-4 py-1.5">
        <span className="text-xs font-heading font-semibold text-muted-foreground">
          Action History ({history.length - 1} actions)
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <ScrollArea className="max-h-40">
        <div className="px-4 pb-2 space-y-0.5">
          {history.length <= 1 ? (
            <p className="text-xs text-muted-foreground/50 py-2">No actions yet</p>
          ) : (
            [...history].reverse().map((entry, reverseIdx) => {
              const realIdx = history.length - 1 - reverseIdx;
              const isCurrent = realIdx === historyIndex;
              const isFuture = realIdx > historyIndex;

              return (
                <div
                  key={`${entry.timestamp}-${reverseIdx}`}
                  className={cn(
                    'flex items-center gap-2 py-1 px-2 rounded text-xs font-mono',
                    isCurrent && 'bg-white/10 text-white',
                    isFuture && 'text-muted-foreground/30',
                    !isCurrent && !isFuture && 'text-muted-foreground/60',
                  )}
                >
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan shrink-0" />
                  )}
                  <span className={cn(!isCurrent && 'ml-3.5')}>
                    {entry.description}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground/30">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
