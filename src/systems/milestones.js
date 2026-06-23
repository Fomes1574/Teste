import { PRODUCER_DEFINITIONS } from '../data/producers.js';
import { MILESTONE_UPGRADE_DEFINITIONS } from '../data/milestoneUpgrades.js';

export function unlockedMilestoneUpgrades(state) {
  return MILESTONE_UPGRADE_DEFINITIONS.filter(upgrade => upgrade.unlock(state));
}

export function nextMilestoneForProducer(state, producerId) {
  const quantity = state.producers[producerId] || 0;
  return MILESTONE_UPGRADE_DEFINITIONS
    .filter(upgrade => upgrade.producerId === producerId && !state.milestoneUpgrades.includes(upgrade.id))
    .find(upgrade => upgrade.milestone > quantity || upgrade.unlock(state)) || null;
}

export function milestoneVisibilitySignature(state) {
  return MILESTONE_UPGRADE_DEFINITIONS
    .filter(upgrade => upgrade.unlock(state) || state.milestoneUpgrades.includes(upgrade.id))
    .map(upgrade => `${upgrade.id}:${state.milestoneUpgrades.includes(upgrade.id) ? '1' : '0'}`)
    .join('|');
}

export function newlyReachedMilestones(state) {
  const seen = new Set(state.seenMilestones || []);
  return MILESTONE_UPGRADE_DEFINITIONS.filter(upgrade => upgrade.unlock(state) && !seen.has(upgrade.id));
}

export function markMilestoneSeen(state, milestoneId) {
  if (!state.seenMilestones.includes(milestoneId)) state.seenMilestones.push(milestoneId);
}

export function visualTierForQuantity(quantity) {
  if (quantity >= 1000) return 5;
  if (quantity >= 500) return 4;
  if (quantity >= 250) return 3;
  if (quantity >= 100) return 2;
  if (quantity >= 50) return 1;
  return quantity > 0 ? 0 : -1;
}

export function visualTierSignature(state) {
  return PRODUCER_DEFINITIONS.map(producer => `${producer.id}:${visualTierForQuantity(state.producers[producer.id] || 0)}`).join('|');
}
