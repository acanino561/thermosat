'use client';

import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

export default function AuditLogPage() {
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="font-heading text-3xl font-bold mb-1">Audit Log</h1>
        <p className="text-muted-foreground">
          Track organization activity and changes.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center py-20"
      >
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <p className="text-lg font-medium text-muted-foreground">Coming soon</p>
        <p className="text-sm text-muted-foreground mt-1">
          Audit logging will be available in a future update.
        </p>
      </motion.div>
    </div>
  );
}
