/**
 * Anonymous session management.
 * Each browser gets a unique sessionId stored in localStorage.
 * This is NOT authentication — it's just conversation isolation per browser.
 */

const SESSION_KEY = 'hdak_session_id';

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // localStorage blocked (private mode, etc.) — use in-memory fallback
    return _memorySessionId || (_memorySessionId = crypto.randomUUID());
  }
}

// In-memory fallback for when localStorage is unavailable
let _memorySessionId = '';

export const SESSION_HEADER = 'x-session-id';
