import { addSouls, productionPerSecond } from './economy.js';

// v0.2: altere este valor para mudar o limite inicial de progresso offline.
export const OFFLINE_LIMIT_SECONDS = 60 * 60 * 2;

export function applyOfflineProgress(state, now = Date.now()) {
  const lastSavedAt = Number(state.lastSavedAt) || now;
  const elapsedSeconds = Math.max(0, Math.min((now - lastSavedAt) / 1000, OFFLINE_LIMIT_SECONDS));
  if (elapsedSeconds < 5) return { gained: 0, seconds: elapsedSeconds };
  const gained = productionPerSecond(state, lastSavedAt) * elapsedSeconds;
  addSouls(state, gained, 'production');
  state.lastSavedAt = now;
  return { gained, seconds: elapsedSeconds };
}
