/**
 * In-memory concurrent seat tracker for on-premise deployments.
 * Tracks active user sessions against the license seat limit.
 *
 * NOTE: This uses an in-memory Map — suitable for single-instance deployments.
 * For multi-instance on-premise deployments, replace with Redis-based tracking.
 */

const activeSessions = new Map<string, number>(); // userId → timestamp

export function acquireSeat(userId: string, maxSeats: number): boolean {
  // If user already has a seat, refresh it
  if (activeSessions.has(userId)) {
    activeSessions.set(userId, Date.now());
    return true;
  }

  // Prune stale sessions (inactive > 30 minutes)
  const staleThreshold = Date.now() - 30 * 60 * 1000;
  for (const [id, ts] of activeSessions) {
    if (ts < staleThreshold) {
      activeSessions.delete(id);
    }
  }

  if (activeSessions.size >= maxSeats) {
    return false;
  }

  activeSessions.set(userId, Date.now());
  return true;
}

export function releaseSeat(userId: string): void {
  activeSessions.delete(userId);
}

export function getActiveSeatCount(): number {
  return activeSessions.size;
}
