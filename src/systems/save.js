import { normalizeState } from '../state.js';

export const SAVE_KEY = 'imperioDeMonstrosSave';

export function saveGame(state) {
  state.lastSavedAt = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadRawSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadGame() {
  return normalizeState(loadRawSave());
}

export function parseImportedSave(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.almas !== 'number') return null;
    return normalizeState(parsed);
  } catch {
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}
