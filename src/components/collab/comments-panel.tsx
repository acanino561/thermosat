'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Check, Reply, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  modelId: string;
  userId: string;
  parentId: string | null;
  content: string;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userName: string | null;
  userEmail: string | null;
}

interface CommentsPanelProps {
  projectId: string;
  modelId: string;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getAvatarColor(email: string): string {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function truncateEmail(email: string, max = 20): string {
  return email.length > max ? email.slice(0, max) + '…' : email;
}

export function CommentsPanel({ projectId, modelId }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/models/${modelId}/comments`);
      if (res.ok) {
        const json = await res.json();
        setComments(json.data ?? []);
      }
    } catch {
      // silently fail on refresh
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 30000);
    return () => clearInterval(interval);
  }, [fetchComments]);

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/models/${modelId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          parentId: replyTo?.id,
        }),
      });
      if (res.ok) {
        setContent('');
        setReplyTo(null);
        await fetchComments();
      }
    } finally {
      setPosting(false);
    }
  };

  const handleResolve = async (commentId: string) => {
    // PATCH not available — use comment API conventions
    // For now, just refetch; resolve endpoint can be added later
    await fetchComments();
  };

  const unresolvedCount = comments.filter((c) => !c.resolved && !c.parentId).length;
  const topLevel = comments.filter((c) => !c.parentId);
  const replies = comments.filter((c) => c.parentId);

  const getReplies = (parentId: string) =>
    replies.filter((r) => r.parentId === parentId);

  const renderComment = (comment: Comment, indent = false) => {
    const email = comment.userEmail ?? 'unknown';
    const initial = email[0]?.toUpperCase() ?? '?';

    return (
      <div
        key={comment.id}
        className={cn(
          'group rounded-lg border border-white/10 bg-white/[0.02] p-3 transition-colors',
          indent && 'ml-4',
          comment.resolved && 'opacity-50',
        )}
      >
        <div className="flex items-start gap-2">
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
              getAvatarColor(email),
            )}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-white/80 truncate">
                {truncateEmail(email)}
              </span>
              <span className="text-[10px] text-white/40">
                {getRelativeTime(comment.createdAt)}
              </span>
              {comment.resolved && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-400 border-green-400/40">
                  Resolved
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-white/70 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          </div>
        </div>

        {/* Hover actions */}
        <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!comment.resolved && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-white/50 hover:text-green-400"
              onClick={() => handleResolve(comment.id)}
            >
              <Check className="h-3 w-3 mr-1" />
              Resolve
            </Button>
          )}
          {!comment.parentId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-white/50 hover:text-blue-400"
              onClick={() => setReplyTo(comment)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-80 flex-col border-l border-white/10 bg-black/40">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <MessageSquare className="h-4 w-4 text-white/60" />
        <span className="text-sm font-heading font-semibold">Comments</span>
        {unresolvedCount > 0 && (
          <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0 ml-auto">
            {unresolvedCount}
          </Badge>
        )}
      </div>

      {/* Comments list */}
      <ScrollArea className="flex-1 px-3 py-2">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-white/10 p-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/40">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p className="text-sm">No comments yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topLevel.map((comment) => (
              <div key={comment.id}>
                {renderComment(comment)}
                {getReplies(comment.id).map((reply) => renderComment(reply, true))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Reply indicator */}
      {replyTo && (
        <div className="mx-3 flex items-center gap-2 rounded-t-md bg-blue-500/10 border border-b-0 border-blue-500/30 px-3 py-1.5">
          <Reply className="h-3 w-3 text-blue-400" />
          <span className="text-[11px] text-blue-300 truncate">
            Replying to {truncateEmail(replyTo.userEmail ?? 'unknown')}…
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 ml-auto text-white/40 hover:text-white"
            onClick={() => setReplyTo(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Post area */}
      <div className={cn('border-t border-white/10 p-3', replyTo && 'border-t-0')}>
        <Textarea
          placeholder="Write a comment..."
          className="min-h-[60px] resize-none bg-white/5 border-white/10 text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              handlePost();
            }
          }}
        />
        <Button
          variant="glow-orange"
          size="sm"
          className="mt-2 w-full"
          disabled={!content.trim() || posting}
          onClick={handlePost}
        >
          {posting ? 'Posting...' : 'Post'}
        </Button>
      </div>
    </div>
  );
}
