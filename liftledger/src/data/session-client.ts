import { encodeSession, SESSION_COOKIE } from '@/core/auth/session';
import type { Session } from '@/core/repo/types';

const WEEK = 60 * 60 * 24 * 7;

export function signIn(session: Session) {
  document.cookie = `${SESSION_COOKIE}=${encodeSession(session)}; path=/; max-age=${WEEK}; samesite=lax`;
}

export function signOut() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
