'use client';

import { motion } from 'framer-motion';
import { FolderOpen, MoreVertical, Clock } from 'lucide-react';
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

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string;
    modelsCount: number;
    updatedAt: string;
  };
  index: number;
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <Link href={`/dashboard/projects/${project.id}`}>
        <div className="glass rounded-xl p-5 cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:border-accent-blue/30 hover:shadow-lg hover:shadow-accent-blue/5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-accent-blue/10 group-hover:bg-accent-blue/20 transition-colors">
              <FolderOpen className="h-5 w-5 text-accent-blue" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                  onClick={(e) => e.preventDefault()}
                  aria-label="Project options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Rename</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-400">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <h3 className="font-heading text-lg font-semibold mb-1 group-hover:text-accent-blue transition-colors">
            {project.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {project.description || 'No description'}
          </p>

          <div className="flex items-center justify-between">
            <Badge variant="blue">{project.modelsCount} model{project.modelsCount !== 1 ? 's' : ''}</Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDate(project.updatedAt)}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
