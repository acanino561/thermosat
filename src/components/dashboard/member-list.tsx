'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { RoleBadge } from './role-badge';
import { Trash2 } from 'lucide-react';

export interface MemberItem {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'editor' | 'viewer';
  joinedAt: string | null;
}

interface MemberListProps {
  members: MemberItem[];
  currentUserId: string;
  canManage: boolean;
  onRemove?: (userId: string) => void;
  ownerCount?: number;
}

export const MemberList = ({
  members,
  currentUserId,
  canManage,
  onRemove,
  ownerCount = 0,
}: MemberListProps) => {
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isOwnRow = member.userId === currentUserId;
        const isOnlyOwner = member.role === 'owner' && ownerCount <= 1;
        const showRemove = canManage && !isOwnRow && !isOnlyOwner && onRemove;

        return (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs font-bold">
                {getInitials(member.name, member.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {member.name || member.email}
                </span>
                <RoleBadge role={member.role} />
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {member.email}
                {member.joinedAt && (
                  <> · Joined {new Date(member.joinedAt).toLocaleDateString()}</>
                )}
              </p>
            </div>
            {showRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8"
                onClick={() => onRemove(member.userId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
};
