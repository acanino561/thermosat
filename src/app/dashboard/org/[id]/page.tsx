'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Building2 } from 'lucide-react';
import { MemberList, type MemberItem } from '@/components/dashboard/member-list';
import { InviteMemberDialog } from '@/components/dashboard/invite-member-dialog';

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
}

export default function OrgMembersPage() {
  const params = useParams<{ id: string }>();
  const orgId = params.id;
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [myRole, setMyRole] = useState<string>('member');
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch {}
  }, [orgId]);

  useEffect(() => {
    const load = async () => {
      try {
        const [orgRes, membersRes, profileRes] = await Promise.all([
          fetch(`/api/organizations/${orgId}`),
          fetch(`/api/organizations/${orgId}/members`),
          fetch('/api/user/profile'),
        ]);

        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setOrg(orgData);
        }
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData);
        }
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setCurrentUserId(profileData.id);
          // Find user's role in the members list
          const membersData = await (await fetch(`/api/organizations/${orgId}/members`)).json();
          const me = membersData.find((m: MemberItem) => m.userId === profileData.id);
          if (me) setMyRole(me.role);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [orgId]);

  const handleRemove = async (userId: string) => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/members/${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchMembers();
      }
    } catch {}
  };

  const canManage = myRole === 'owner' || myRole === 'admin';
  const ownerCount = members.filter((m) => m.role === 'owner').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <Building2 className="h-6 w-6 text-blue-400" />
          <h1 className="font-heading text-3xl font-bold">{org?.name || 'Organization'}</h1>
        </div>
        <p className="text-muted-foreground">Manage organization members and roles.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold">Members</h2>
          {canManage && (
            <InviteMemberDialog orgId={orgId} onInvited={fetchMembers} />
          )}
        </div>

        <MemberList
          members={members}
          currentUserId={currentUserId}
          canManage={canManage}
          onRemove={handleRemove}
          ownerCount={ownerCount}
        />
      </motion.div>
    </div>
  );
}
