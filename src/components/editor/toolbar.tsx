'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Circle,
  GitBranch,
  Flame,
  Play,
  Save,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  History,
  Clock,
  Check,
  AlertCircle,
  MessageSquare,
  Share2,
} from 'lucide-react';
import { useEditorStore } from '@/lib/stores/editor-store';
import { AddNodeDialog } from './add-node-dialog';
import { AddConductorDialog } from './add-conductor-dialog';
import { AddHeatLoadDialog } from './add-heat-load-dialog';
import { ImportCadButton } from './import-cad-button';
import { HistoryPanel } from './history-panel';
import { VersionHistory } from './version-history';
import { SimulationConfigDialog } from './simulation-config-dialog';
import { CommentsPanel } from '@/components/collab/comments-panel';
import { ShareDialog } from '@/components/collab/share-dialog';
import { ReviewStatusBar } from '@/components/collab/review-status-bar';
import Link from 'next/link';

/** Tooltip wrapper for readOnly mode — shows signup CTA on disabled buttons */
function ReadOnlyTooltip({ children, readOnly }: { children: React.ReactNode; readOnly?: boolean }) {
  if (!readOnly) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent>
        <Link href="/signup" className="text-cyan-400 hover:underline">
          Sign up to use this feature →
        </Link>
      </TooltipContent>
    </Tooltip>
  );
}

interface ToolbarProps {
  projectId: string;
  role?: 'owner' | 'admin' | 'editor' | 'viewer';
  readOnly?: boolean;
}

export function Toolbar({ projectId, role, readOnly }: ToolbarProps) {
  const isViewer = role === 'viewer';
  const {
    modelName,
    isDirty,
    save,
    undo,
    redo,
    history,
    historyIndex,
    simulationStatus,
    runSimulation,
    showResultsOverlay,
    setShowResultsOverlay,
    autoSaveStatus,
    lastSavedAt,
    cleanup,
  } = useEditorStore();

  const modelId = useEditorStore((s) => s.modelId);

  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showSimConfig, setShowSimConfig] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Keyboard shortcuts (disabled in readOnly mode)
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save('Manual save');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, save, readOnly]);

  const handleSave = async () => {
    setIsSaving(true);
    await save('Manual save');
    setIsSaving(false);
  };

  const formatSavedTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleRunSimulation = () => {
    setShowSimConfig(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-4 py-2 glass border-b border-white/10"
      >
        {/* Back + title */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/dashboard/projects/${projectId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back to project</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-2">
          <span className="font-heading font-semibold text-sm">{modelName}</span>
          {autoSaveStatus === 'saving' ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-400 border-blue-400 gap-1">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              Saving...
            </Badge>
          ) : autoSaveStatus === 'saved' && lastSavedAt ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-400 border-green-400 gap-1">
              <Check className="h-2.5 w-2.5" />
              Saved {formatSavedTime(lastSavedAt)}
            </Badge>
          ) : autoSaveStatus === 'error' ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-400 border-red-400 gap-1">
              <AlertCircle className="h-2.5 w-2.5" />
              Save failed
            </Badge>
          ) : isDirty ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-400 border-orange-400">
              unsaved
            </Badge>
          ) : null}
        </div>

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* View Only badge for viewers */}
        {isViewer && (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-amber-400 border-amber-400/40 uppercase tracking-wider font-semibold">
            View Only
          </Badge>
        )}

        {/* Add elements — hidden for viewers, disabled for readOnly */}
        {!isViewer && !readOnly && (
          <>
            <AddNodeDialog />
            <AddConductorDialog />
            <AddHeatLoadDialog />
          </>
        )}
        {readOnly && (
          <>
            <ReadOnlyTooltip readOnly>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" disabled>
                <Circle className="h-3.5 w-3.5" />
                Node
              </Button>
            </ReadOnlyTooltip>
            <ReadOnlyTooltip readOnly>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" disabled>
                <GitBranch className="h-3.5 w-3.5" />
                Conductor
              </Button>
            </ReadOnlyTooltip>
            <ReadOnlyTooltip readOnly>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" disabled>
                <Flame className="h-3.5 w-3.5" />
                Heat Load
              </Button>
            </ReadOnlyTooltip>
          </>
        )}

        {!isViewer && <Separator orientation="vertical" className="h-6 mx-2" />}

        {/* CAD Import */}
        {!isViewer && !readOnly && <ImportCadButton />}
        {readOnly && (
          <ReadOnlyTooltip readOnly>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" disabled>
              Import CAD
            </Button>
          </ReadOnlyTooltip>
        )}

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* Undo/Redo */}
        <ReadOnlyTooltip readOnly={readOnly}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={readOnly ? undefined : undo}
                disabled={readOnly || !canUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            {!readOnly && <TooltipContent>Undo (Ctrl+Z)</TooltipContent>}
          </Tooltip>
        </ReadOnlyTooltip>

        <ReadOnlyTooltip readOnly={readOnly}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={readOnly ? undefined : redo}
                disabled={readOnly || !canRedo}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            {!readOnly && <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>}
          </Tooltip>
        </ReadOnlyTooltip>

        {/* History panel toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showHistory ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Action history</TooltipContent>
        </Tooltip>

        {/* Version history toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showVersionHistory ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setShowVersionHistory(!showVersionHistory)}
            >
              <Clock className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Version history</TooltipContent>
        </Tooltip>

        {/* Save */}
        <ReadOnlyTooltip readOnly={readOnly}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={readOnly ? undefined : handleSave}
                disabled={readOnly || !isDirty || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            {!readOnly && <TooltipContent>Save (Ctrl+S)</TooltipContent>}
          </Tooltip>
        </ReadOnlyTooltip>

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* Toggle results overlay */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowResultsOverlay(!showResultsOverlay)}
            >
              {showResultsOverlay ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showResultsOverlay ? 'Hide results overlay' : 'Show results overlay'}
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* Collab: Review Status — not shown in readOnly/demo mode */}
        {modelId && !readOnly && <ReviewStatusBar modelId={modelId} />}

        {/* Collab: Share — not shown in readOnly/demo mode */}
        {modelId && !readOnly && (
          <ShareDialog
            modelId={modelId}
            trigger={
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share</TooltipContent>
              </Tooltip>
            }
          />
        )}

        {/* Collab: Comments toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showComments ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Comments</TooltipContent>
        </Tooltip>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Run Simulation — hidden for viewers, disabled for readOnly */}
        {!isViewer && (
          <ReadOnlyTooltip readOnly={readOnly}>
            <Button
              variant="glow-orange"
              size="default"
              className="gap-2"
              onClick={readOnly ? undefined : handleRunSimulation}
              disabled={readOnly || simulationStatus === 'running'}
            >
              {simulationStatus === 'running' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Simulation
                </>
              )}
            </Button>
          </ReadOnlyTooltip>
        )}
      </motion.div>

      {/* History panel (collapsible, below toolbar) */}
      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}

      {/* Version history sidebar */}
      {showVersionHistory && (
        <VersionHistory onClose={() => setShowVersionHistory(false)} />
      )}

      {/* Simulation config dialog — only mount when not in readOnly/demo mode */}
      {!readOnly && (
        <SimulationConfigDialog
          open={showSimConfig}
          onOpenChange={setShowSimConfig}
        />
      )}

      {/* Comments sidebar */}
      {showComments && modelId && (
        <div className="fixed right-0 top-0 z-40 h-screen">
          <CommentsPanel projectId={projectId} modelId={modelId} />
        </div>
      )}
    </>
  );
}
