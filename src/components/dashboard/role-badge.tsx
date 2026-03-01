'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Role = 'owner' | 'admin' | 'member' | 'editor' | 'viewer';

const roleColors: Record<Role, string> = {
  owner: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  admin: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  editor: 'bg-green-500/15 text-green-500 border-green-500/30',
  member: 'bg-white/10 text-muted-foreground border-white/20',
  viewer: 'bg-white/10 text-muted-foreground border-white/20',
};

interface RoleBadgeProps {
  role: Role;
  className?: string;
}

export const RoleBadge = ({ role, className }: RoleBadgeProps) => {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] uppercase tracking-wider font-semibold',
        roleColors[role],
        className,
      )}
    >
      {role}
    </Badge>
  );
};
