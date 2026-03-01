'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MemberList, type MemberItem } from '@/components/dashboard/member-list';
import { Loader2, ArrowLeft, UserPlus, FolderPlus, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface TeamDetail {
  id: string;
  name: string;
  description: string | null;
}

interface TeamProject {
  id: string;
  projectId: string;
  name: string;
  description: string;
}

interface OrgProject {
  id: string;
  name: string;
  description: string;
}

export default function TeamDetailPage() {
  const params = useParams<{ id: string; tid: string }>();
  const orgId = params.id;
  const teamId = params.tid;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [orgProjects, setOrgProjects] = useState<OrgProject[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add member dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Assign project dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members`);
      if (res.ok) setMembers(await res.json());
    } catch {}
  }, [teamId]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/projects`);
      if (res.ok) setProjects(await res.json());
    } catch {}
  }, [teamId]);

  useEffect(() => {
    const load = async () => {
      try {
        const [teamRes, membersRes, projectsRes, profileRes, orgMembersRes] = await Promise.all([
          fetch(`/api/teams/${teamId}`),
          fetch(`/api/teams/${teamId}/members`),
          fetch(`/api/teams/${teamId}/projects`),
          fetch('/api/user/profile'),
          fetch(`/api/organizations/${orgId}/members`),
        ]);

        if (teamRes.ok) setTeam(await teamRes.json());
        if (membersRes.ok) setMembers(await membersRes.json());
        if (projectsRes.ok) setProjects(await projectsRes.json());

        if (profileRes.ok) {
          const profile = await profileRes.json();
          setCurrentUserId(profile.id);

          // Check if user is org admin/owner or team admin
          if (orgMembersRes.ok) {
            const orgMembers = await orgMembersRes.json();
            const me = orgMembers.find((m: MemberItem) => m.userId === profile.id);
            if (me && (me.role === 'owner' || me.role === 'admin')) {
              setCanManage(true);
            }
          }
        }

        // Fetch org projects for assign dialog
        // We'll use a simple projects endpoint — just show all org projects
        // and filter out already-assigned ones
      } catch {}
      setLoading(false);
    };
    load();
  }, [teamId, orgId]);

  // Fetch org projects when assign dialog opens
  useEffect(() => {
    if (!assignOpen) return;
    // Org projects would ideally come from an org projects endpoint
    // For now fetch all projects and show org ones
    fetch(`/api/organizations/${orgId}/teams`)
      .then(() => {
        // We don't have a direct org projects endpoint, so we'll skip filtering for now
        // The assign endpoint handles validation
      })
      .catch(() => {});
  }, [assignOpen, orgId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMember(true);
    setMemberError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: memberEmail, role: memberRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMemberError(data.error || 'Failed to add member');
      } else {
        setAddMemberOpen(false);
        setMemberEmail('');
        setMemberRole('viewer');
        fetchMembers();
      }
    } catch {
      setMemberError('Failed to add member');
    }
    setAddingMember(false);
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) fetchMembers();
    } catch {}
  };

  const handleAssignProject = async () => {
    if (!selectedProjectId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });
      if (res.ok) {
        setAssignOpen(false);
        setSelectedProjectId('');
        fetchProjects();
      }
    } catch {}
    setAssigning(false);
  };

  const handleRemoveProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/projects`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (res.ok) fetchProjects();
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          href={`/dashboard/org/${orgId}/teams`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to teams
        </Link>
        <h1 className="font-heading text-3xl font-bold">{team?.name || 'Team'}</h1>
        {team?.description && (
          <p className="text-muted-foreground mt-1">{team.description}</p>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Members */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-white/[0.03] border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading">Members</CardTitle>
                {canManage && (
                  <Dialog open={addMemberOpen} onOpenChange={(v) => { setAddMemberOpen(v); setMemberError(null); }}>
                    <DialogTrigger asChild>
                      <Button variant="glow" size="sm" className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleAddMember}>
                        <DialogHeader>
                          <DialogTitle>Add Team Member</DialogTitle>
                          <DialogDescription>
                            Add an organization member to this team by email.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 my-6">
                          <div className="space-y-2">
                            <Label htmlFor="member-email">Email address</Label>
                            <Input
                              id="member-email"
                              type="email"
                              placeholder="colleague@company.com"
                              value={memberEmail}
                              onChange={(e) => setMemberEmail(e.target.value)}
                              required
                              disabled={addingMember}
                              className="bg-white/5"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={memberRole} onValueChange={(v) => setMemberRole(v as 'admin' | 'editor' | 'viewer')}>
                              <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {memberError && (
                            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                              {memberError}
                            </p>
                          )}
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="ghost" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
                          <Button type="submit" variant="glow" disabled={addingMember || !memberEmail.trim()}>
                            {addingMember ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Add Member
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No members yet</p>
              ) : (
                <MemberList
                  members={members}
                  currentUserId={currentUserId}
                  canManage={canManage}
                  onRemove={handleRemoveMember}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Projects */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="bg-white/[0.03] border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading">Projects</CardTitle>
                {canManage && (
                  <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                    <DialogTrigger asChild>
                      <Button variant="glow" size="sm" className="gap-2">
                        <FolderPlus className="h-4 w-4" />
                        Assign Project
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Project</DialogTitle>
                        <DialogDescription>
                          Enter the project ID to assign to this team.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 my-6">
                        <div className="space-y-2">
                          <Label htmlFor="project-id">Project ID</Label>
                          <Input
                            id="project-id"
                            placeholder="Project UUID"
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="bg-white/5"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setAssignOpen(false)}>Cancel</Button>
                        <Button variant="glow" disabled={assigning || !selectedProjectId.trim()} onClick={handleAssignProject}>
                          {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Assign
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No projects assigned</p>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{project.name}</p>
                        {project.description && (
                          <p className="text-xs text-muted-foreground truncate">{project.description}</p>
                        )}
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 shrink-0"
                          onClick={() => handleRemoveProject(project.projectId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
