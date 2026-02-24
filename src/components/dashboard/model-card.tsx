'use client';

import { motion } from 'framer-motion';
import { Layers, MoreVertical, Clock, Thermometer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface ModelCardProps {
  model: {
    id: string;
    name: string;
    description: string;
    nodesCount: number;
    version: number;
    updatedAt: string;
    lastSimStatus?: 'completed' | 'running' | 'failed' | null;
  };
  projectId: string;
  index: number;
}

const statusColors = {
  completed: 'text-green-400',
  running: 'text-accent-blue',
  failed: 'text-red-400',
};

export function ModelCard({ model, projectId, index }: ModelCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <Link href={`/dashboard/projects/${projectId}/models/${model.id}`}>
        <div className="glass rounded-xl p-5 cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:border-accent-cyan/30 hover:shadow-lg hover:shadow-accent-cyan/5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-accent-cyan/10 group-hover:bg-accent-cyan/20 transition-colors">
              <Layers className="h-5 w-5 text-accent-cyan" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                  onClick={(e) => e.preventDefault()}
                  aria-label="Model options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Rename</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuItem>View Results</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-400">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <h3 className="font-heading text-lg font-semibold mb-1 group-hover:text-accent-cyan transition-colors">
            {model.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {model.description || 'No description'}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="cyan">
                <Thermometer className="h-3 w-3 mr-1" />
                {model.nodesCount} nodes
              </Badge>
              <Badge variant="outline">v{model.version}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {model.lastSimStatus && (
                <div className={`h-2 w-2 rounded-full ${
                  model.lastSimStatus === 'completed' ? 'bg-green-400' :
                  model.lastSimStatus === 'running' ? 'bg-accent-blue animate-pulse' :
                  'bg-red-400'
                }`} />
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDate(model.updatedAt)}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
