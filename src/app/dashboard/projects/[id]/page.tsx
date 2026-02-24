'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Settings, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModelCard } from '@/components/dashboard/model-card';
import { CreateModelDialog } from '@/components/dashboard/create-model-dialog';
import { EmptyState } from '@/components/dashboard/empty-state';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Demo data
const demoProject = {
  id: '1',
  name: 'CubeSat 3U Thermal',
  description: 'Complete thermal analysis for a 3U CubeSat in LEO sun-synchronous orbit at 550km altitude. Includes solar panels, battery pack, OBC, and payload.',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-02-20T14:30:00Z',
};

const demoModels = [
  {
    id: 'm1',
    name: 'Solar Panel Assembly',
    description: 'Thermal model for deployed solar arrays with sun-facing and anti-sun panels.',
    nodesCount: 24,
    version: 3,
    updatedAt: '2025-02-20T14:30:00Z',
    lastSimStatus: 'completed' as const,
  },
  {
    id: 'm2',
    name: 'Battery Pack',
    description: 'Li-ion battery module thermal analysis. Heater control during eclipse.',
    nodesCount: 12,
    version: 2,
    updatedAt: '2025-02-18T16:00:00Z',
    lastSimStatus: 'completed' as const,
  },
  {
    id: 'm3',
    name: 'OBC & Payload',
    description: 'On-board computer and payload electronics thermal management.',
    nodesCount: 18,
    version: 1,
    updatedAt: '2025-02-15T11:00:00Z',
    lastSimStatus: null,
  },
];

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-3xl font-bold">{demoProject.name}</h1>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <p className="text-muted-foreground mt-1">{demoProject.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Updated Feb 20, 2025
          </div>
          <Badge variant="outline">{demoModels.length} models</Badge>
        </div>
      </motion.div>

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">Thermal Models</h2>
        <CreateModelDialog projectId={projectId} />
      </div>

      {demoModels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {demoModels.map((model, i) => (
            <ModelCard key={model.id} model={model} projectId={projectId} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No models yet"
          description="Create your first thermal model to start analyzing temperatures."
          action={<CreateModelDialog projectId={projectId} />}
        />
      )}
    </div>
  );
}
