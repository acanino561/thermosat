'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewStatusBarProps {
  modelId: string;
}

type ReviewStatus = 'draft' | 'in_review' | 'approved' | 'needs_changes';

const statusConfig: Record<ReviewStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'text-white/60 border-white/20 bg-white/5' },
  in_review: { label: 'In Review', className: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10' },
  approved: { label: 'Approved', className: 'text-green-400 border-green-400/40 bg-green-400/10' },
  needs_changes: { label: 'Needs Changes', className: 'text-red-400 border-red-400/40 bg-red-400/10' },
};

const statusActions: Array<{ label: string; status: ReviewStatus }> = [
  { label: 'Draft', status: 'draft' },
  { label: 'Submit for Review', status: 'in_review' },
  { label: 'Approve', status: 'approved' },
  { label: 'Request Changes', status: 'needs_changes' },
];

export function ReviewStatusBar({ modelId }: ReviewStatusBarProps) {
  const [status, setStatus] = useState<ReviewStatus>('draft');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/models/${modelId}/review-status`);
        if (res.ok) {
          const json = await res.json();
          if (json.data?.status) {
            setStatus(json.data.status as ReviewStatus);
          }
        }
      } catch {
        // silently fail
      }
    };
    fetchStatus();
  }, [modelId]);

  const handleChange = async (newStatus: ReviewStatus) => {
    const prev = status;
    setStatus(newStatus);
    try {
      const res = await fetch(`/api/models/${modelId}/review-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: '' }),
      });
      if (!res.ok) setStatus(prev);
    } catch {
      setStatus(prev);
    }
  };

  const config = statusConfig[status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2">
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.className)}>
            {config.label}
          </Badge>
          <ChevronDown className="h-3 w-3 text-white/40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {statusActions.map((action) => (
          <DropdownMenuItem
            key={action.status}
            onClick={() => handleChange(action.status)}
            className={cn(status === action.status && 'bg-white/10')}
          >
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0 mr-2', statusConfig[action.status].className)}
            >
              {statusConfig[action.status].label}
            </Badge>
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
