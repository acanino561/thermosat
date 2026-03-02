'use client';

import { useState } from 'react';

interface UpdateResult {
  selfHosted?: boolean;
  available?: boolean;
  currentVersion?: string;
  latestVersion?: string;
  releaseDate?: string;
  changelog?: string;
  imageTag?: string;
  updateCommand?: string;
  error?: string;
}

interface SnapshotResult {
  success?: boolean;
  snapshotPath?: string;
  timestamp?: string;
  error?: string;
}

export function UpdatesClient() {
  const [checking, setChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);
  const [snapshotting, setSnapshotting] = useState(false);
  const [snapshotResult, setSnapshotResult] = useState<SnapshotResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function checkForUpdates() {
    setChecking(true);
    setUpdateResult(null);
    try {
      const res = await fetch('/api/admin/updates/check');
      const data = await res.json();
      setUpdateResult(data);
    } catch {
      setUpdateResult({ error: 'Failed to check for updates' });
    } finally {
      setChecking(false);
    }
  }

  async function takeSnapshot() {
    setSnapshotting(true);
    setSnapshotResult(null);
    try {
      const res = await fetch('/api/admin/updates/snapshot', { method: 'POST' });
      const data = await res.json();
      setSnapshotResult(data);
    } catch {
      setSnapshotResult({ error: 'Failed to create snapshot' });
    } finally {
      setSnapshotting(false);
    }
  }

  function copyCommand(cmd: string) {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Check for Updates */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Check for Updates
        </h2>
        <button
          onClick={checkForUpdates}
          disabled={checking}
          className="px-4 py-2 rounded-lg bg-accent-blue text-white text-sm font-medium hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
        >
          {checking ? 'Checking…' : 'Check for Updates'}
        </button>

        {updateResult && (
          <div className="mt-4 space-y-3">
            {updateResult.selfHosted === false && (
              <p className="text-sm text-muted-foreground">
                This is a cloud-hosted instance. Updates are managed automatically.
              </p>
            )}
            {updateResult.error && (
              <p className="text-sm text-yellow-400">{updateResult.error}</p>
            )}
            {updateResult.available === false && !updateResult.error && (
              <p className="text-sm text-green-400">
                ✓ You&apos;re running the latest version ({updateResult.currentVersion}).
              </p>
            )}
            {updateResult.available === true && (
              <div className="space-y-2">
                <p className="text-sm text-accent-blue font-medium">
                  Update available: v{updateResult.latestVersion}
                </p>
                {updateResult.releaseDate && (
                  <p className="text-xs text-muted-foreground">
                    Released: {updateResult.releaseDate}
                  </p>
                )}
                {updateResult.changelog && (
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                    {updateResult.changelog}
                  </p>
                )}
                {updateResult.updateCommand && (
                  <div className="relative">
                    <pre className="bg-black/40 rounded-md p-3 text-xs font-mono text-foreground/90 overflow-x-auto">
                      {updateResult.updateCommand}
                    </pre>
                    <button
                      onClick={() => copyCommand(updateResult.updateCommand!)}
                      className="absolute top-2 right-2 px-2 py-1 text-[10px] rounded bg-white/10 hover:bg-white/20 text-muted-foreground transition-colors"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* DB Snapshot */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Database Snapshot
        </h2>
        <p className="text-sm text-muted-foreground">
          Take a snapshot of your database before updating. The backup is saved on the server.
        </p>
        <button
          onClick={takeSnapshot}
          disabled={snapshotting}
          className="px-4 py-2 rounded-lg bg-white/10 text-foreground text-sm font-medium hover:bg-white/15 disabled:opacity-50 transition-colors"
        >
          {snapshotting ? 'Creating Snapshot…' : 'Take DB Snapshot'}
        </button>

        {snapshotResult && (
          <div className="mt-2">
            {snapshotResult.success ? (
              <p className="text-sm text-green-400">
                ✓ Snapshot saved to <code className="text-xs">{snapshotResult.snapshotPath}</code>
              </p>
            ) : (
              <p className="text-sm text-red-400">
                ✗ {snapshotResult.error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
