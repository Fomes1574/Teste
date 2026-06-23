import { PRODUCER_DEFINITIONS } from './data/producers.js';

export const SAVE_VERSION = 1;

export function createDefaultState() {
  return {
    saveVersion: SAVE_VERSION,
    almas: 0,
    chamasAzuis: 0,
    producers: Object.fromEntries(PRODUCER_DEFINITIONS.map(p => [p.id, 0])),
    upgrades: [],
    milestoneUpgrades: [],
    seenMilestones: [],
    totalSouls: 0,
    totalClicks: 0,
    bloodMoonUntil: 0,
    lastSavedAt: Date.now()
  };
}

export function normalizeState(raw) {
  const base = createDefaultState();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    saveVersion: SAVE_VERSION,
    producers: { ...base.producers, ...(raw.producers || {}) },
    upgrades: Array.isArray(raw.upgrades) ? raw.upgrades : [],
    milestoneUpgrades: Array.isArray(raw.milestoneUpgrades) ? raw.milestoneUpgrades : [],
    seenMilestones: Array.isArray(raw.seenMilestones) ? raw.seenMilestones : []
  };
}
