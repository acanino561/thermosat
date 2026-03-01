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
} from 'lucide-react';
import { useEditorStore } from '@/lib/stores/editor-store';
import { AddNodeDialog } from './add-node-dialog';
import { AddConductorDialog } from './add-conductor-dialog';
import { AddHeatLoadDialog } from './add-heat-load-dialog';
import { ImportCadButton } from './import-cad-button';
import { HistoryPanel } from './history-panel';
import { VersionHistory } from './version-history';
import { SimulationConfigDialog } from './simulation-config-dialog';
import Link from 'next/link';

interface ToolbarProps {
  projectId: string;
  role?: 'owner' | 'admin' | 'editor' | 'viewer';
}

export function Toolbar({ projectId, role }: ToolbarProps) {
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

  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showSimConfig, setShowSimConfig] = useState(false);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Keyboard shortcuts
  useEffect(() => {
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
  }, [undo, redo, save]);

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

        {/* Add elements — hidden for viewers */}
        {!isViewer && (
          <>
            <AddNodeDialog />
            <AddConductorDialog />
            <AddHeatLoadDialog />
          </>
        )}

        {!isViewer && <Separator orientation="vertical" className="h-6 mx-2" />}

        {/* CAD Import */}
        {!isViewer && <ImportCadButton />}

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* Undo/Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={!canUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={!canRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>

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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save (Ctrl+S)</TooltipContent>
        </Tooltip>

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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Run Simulation — hidden for viewers */}
        {!isViewer && (
          <Button
            variant="glow-orange"
            size="default"
            className="gap-2"
            onClick={handleRunSimulation}
            disabled={simulationStatus === 'running'}
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
        )}
      </motion.div>

      {/* History panel (collapsible, below toolbar) */}
      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}

      {/* Version history sidebar */}
      {showVersionHistory && (
        <VersionHistory onClose={() => setShowVersionHistory(false)} />
      )}

      {/* Simulation config dialog */}
      <SimulationConfigDialog
        open={showSimConfig}
        onOpenChange={setShowSimConfig}
      />
    </>
  );
}
