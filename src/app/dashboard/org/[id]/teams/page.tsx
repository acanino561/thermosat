'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus, Users, Building2 } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description: string | null;
  memberCount?: number;
}

interface OrgDetail {
  id: string;
  name: string;
}

export default function TeamsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orgId = params.id;
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchTeams = async () => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/teams`);
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch {}
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [orgRes, teamsRes] = await Promise.all([
          fetch(`/api/organizations/${orgId}`),
          fetch(`/api/organizations/${orgId}/teams`),
        ]);
        if (orgRes.ok) setOrg(await orgRes.json());
        if (teamsRes.ok) setTeams(await teamsRes.json());
      } catch {}
      setLoading(false);
    };
    load();
  }, [orgId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName, description: teamDesc }),
      });
      if (res.ok) {
        setCreateOpen(false);
        setTeamName('');
        setTeamDesc('');
        fetchTeams();
      }
    } catch {}
    setCreating(false);
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
        <div className="flex items-center gap-3 mb-1">
          <Building2 className="h-6 w-6 text-blue-400" />
          <h1 className="font-heading text-3xl font-bold">{org?.name || 'Organization'}</h1>
        </div>
        <p className="text-muted-foreground">Manage teams within your organization.</p>
      </motion.div>

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">Teams</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="glow" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Team</DialogTitle>
                <DialogDescription>
                  Teams group members and control access to projects.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 my-6">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team name</Label>
                  <Input
                    id="team-name"
                    placeholder="e.g., Thermal Analysis"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    required
                    disabled={creating}
                    className="bg-white/5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-desc">Description (optional)</Label>
                  <Textarea
                    id="team-desc"
                    placeholder="What does this team work on?"
                    value={teamDesc}
                    onChange={(e) => setTeamDesc(e.target.value)}
                    disabled={creating}
                    className="bg-white/5 min-h-[80px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" variant="glow" disabled={creating || !teamName.trim()}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Team'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 text-muted-foreground"
        >
          <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No teams yet</p>
          <p className="text-sm">Create your first team to organize members and projects.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team, i) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-white/[0.03] border-white/10 hover:border-white/20 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-heading font-semibold">{team.name}</h3>
                      {team.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {team.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-muted-foreground">
                      {team.memberCount ?? 0} members
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/5 border-white/10"
                      onClick={() => router.push(`/dashboard/org/${orgId}/teams/${team.id}`)}
                    >
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
