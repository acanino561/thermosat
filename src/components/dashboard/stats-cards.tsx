'use client';

import { motion } from 'framer-motion';
import { FolderOpen, Activity, Clock, Zap } from 'lucide-react';

const stats = [
  { icon: FolderOpen, label: 'Total Projects', value: '12', color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
  { icon: Activity, label: 'Simulations Run', value: '47', color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
  { icon: Clock, label: 'Last Active', value: '2h ago', color: 'text-accent-orange', bg: 'bg-accent-orange/10' },
  { icon: Zap, label: 'Compute Hours', value: '3.2h', color: 'text-green-400', bg: 'bg-green-400/10' },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.4 }}
          className="glass rounded-xl p-5 hover:border-white/20 transition-all duration-300 group cursor-default"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <span className="text-sm text-muted-foreground">{stat.label}</span>
          </div>
          <div className="text-3xl font-heading font-bold">{stat.value}</div>
        </motion.div>
      ))}
    </div>
  );
}
