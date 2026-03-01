'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { ProjectCard } from '@/components/dashboard/project-card';
import { CreateProjectDialog } from '@/components/dashboard/create-project-dialog';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Search, Rocket } from 'lucide-react';
import Link from 'next/link';

interface DemoInfo {
  projectId: string;
  modelId: string | null;
  runId: string | null;
  name: string;
  description: string;
}

// Demo data for display — in production, fetched from API
const demoProjects = [
  {
    id: '1',
    name: 'CubeSat 3U Thermal',
    description: 'Thermal analysis for a 3U CubeSat in LEO sun-synchronous orbit. Includes solar panels, battery pack, and OBC.',
    modelsCount: 3,
    updatedAt: '2025-02-20T14:30:00Z',
  },
  {
    id: '2',
    name: 'Mars Orbiter Radiator',
    description: 'Radiator sizing study for a Mars orbiter. Evaluating fin designs and MLI configurations.',
    modelsCount: 2,
    updatedAt: '2025-02-18T09:15:00Z',
  },
  {
    id: '3',
    name: 'GEO Comms Satellite',
    description: 'Full thermal model for a GEO communications satellite. Transponder waste heat management.',
    modelsCount: 5,
    updatedAt: '2025-02-15T16:00:00Z',
  },
  {
    id: '4',
    name: 'ISS Experiment Module',
    description: 'Thermal analysis for an external ISS experiment. RAM/WAKE facing configurations.',
    modelsCount: 1,
    updatedAt: '2025-02-10T11:20:00Z',
  },
];

export default function DashboardPage() {
  const [search, setSearch] = useState('');
  const [demo, setDemo] = useState<DemoInfo | null>(null);

  useEffect(() => {
    fetch('/api/demo')
      .then((r) => r.json())
      .then((data) => {
        if (data.demo) setDemo(data.demo);
      })
      .catch(() => {});
  }, []);

  const filteredProjects = demoProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="font-heading text-3xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back. Here&apos;s an overview of your thermal analysis projects.
        </p>
      </motion.div>

      <StatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Demo CTA — only shown when seed has been run */}
          {demo && demo.modelId && (
            <Link href={`/dashboard/projects/${demo.projectId}/models/${demo.modelId}`}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="glass rounded-xl p-5 cursor-pointer group transition-all duration-300 hover:scale-[1.01] border border-accent-blue/20 hover:border-accent-blue/40 hover:shadow-lg hover:shadow-accent-blue/10 bg-gradient-to-r from-accent-blue/5 to-transparent"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-accent-blue/15 group-hover:bg-accent-blue/25 transition-colors">
                    <Rocket className="h-6 w-6 text-accent-blue" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading text-lg font-semibold group-hover:text-accent-blue transition-colors">
                        Try the Demo — {demo.name}
                      </h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-blue/20 text-accent-blue">
                        Live
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {demo.description || '12-node thermal model with pre-loaded simulation results, What If sliders, and orbit playback. No setup required.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            </Link>
          )}

          {/* Search + Create */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/5"
              />
            </div>
            <CreateProjectDialog />
          </div>

          {/* Project grid */}
          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((project, i) => (
                <ProjectCard key={project.id} project={project} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No projects found"
              description={
                search
                  ? 'No projects match your search. Try different keywords.'
                  : "You haven't created any projects yet. Create your first project to get started."
              }
            />
          )}
        </div>

        <div>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
