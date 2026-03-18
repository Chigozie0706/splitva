// lib/session-store.ts
interface Session {
  fid: string;
  createdAt: number;
}

// In-memory session store (use Redis in production)
const sessions = new Map<string, Session>();

export function createSession(fid: string): string {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, {
    fid,
    createdAt: Date.now(),
  });
  return sessionId;
}

export function getSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  // Check if session is expired (7 days)
  const isExpired = Date.now() - session.createdAt > 7 * 24 * 60 * 60 * 1000;
  if (isExpired) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}