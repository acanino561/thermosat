'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { ProjectCard } from '@/components/dashboard/project-card';
import { CreateProjectDialog } from '@/components/dashboard/create-project-dialog';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Search } from 'lucide-react';

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
