'use client';

import { motion } from 'framer-motion';
import { Activity, Play, Save, Plus, CheckCircle2 } from 'lucide-react';

const activities = [
  {
    icon: CheckCircle2,
    message: 'Simulation completed on "Solar Panel Assembly"',
    time: '2 hours ago',
    color: 'text-green-400',
  },
  {
    icon: Play,
    message: 'Started transient analysis on "Bus Structure Model"',
    time: '3 hours ago',
    color: 'text-accent-blue',
  },
  {
    icon: Save,
    message: 'Saved changes to "Antenna Thermal Model"',
    time: '5 hours ago',
    color: 'text-accent-cyan',
  },
  {
    icon: Plus,
    message: 'Created new model "Battery Pack Thermal"',
    time: '1 day ago',
    color: 'text-accent-orange',
  },
  {
    icon: Plus,
    message: 'Created project "Mars Orbiter Thermal"',
    time: '2 days ago',
    color: 'text-purple-400',
  },
];

export function ActivityFeed() {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-heading text-sm font-semibold">Recent Activity</h3>
      </div>
      <div className="space-y-3">
        {activities.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="flex items-start gap-3 py-2"
          >
            <item.icon className={`h-4 w-4 mt-0.5 shrink-0 ${item.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{item.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
