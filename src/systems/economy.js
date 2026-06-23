import { PRODUCER_DEFINITIONS } from '../data/producers.js';
import { UPGRADE_DEFINITIONS } from '../data/upgrades.js';
import { BLOOD_MOON_CONFIG } from './events.js';

export function currentCost(producer, state) {
  return producer.baseCost * Math.pow(producer.growth, state.producers[producer.id] || 0);
}

export function clickPower(state) {
  return 1 + UPGRADE_DEFINITIONS
    .filter(upgrade => upgrade.type === 'click' && state.upgrades.includes(upgrade.id))
    .reduce((sum, upgrade) => sum + upgrade.amount, 0);
}

export function productionPerSecond(state, now = Date.now()) {
  let total = 0;
  for (const producer of PRODUCER_DEFINITIONS) {
    const producerMultiplier = UPGRADE_DEFINITIONS
      .filter(upgrade => upgrade.type === 'producer' && upgrade.producerId === producer.id && state.upgrades.includes(upgrade.id))
      .reduce((multiplier, upgrade) => multiplier * upgrade.multiplier, 1);
    total += (state.producers[producer.id] || 0) * producer.production * producerMultiplier;
  }
  total *= UPGRADE_DEFINITIONS
    .filter(upgrade => upgrade.type === 'global' && state.upgrades.includes(upgrade.id))
    .reduce((multiplier, upgrade) => multiplier * upgrade.multiplier, 1);
  if (now < state.bloodMoonUntil) total *= BLOOD_MOON_CONFIG.multiplier;
  return total;
}

export function addSouls(state, amount) {
  state.almas += amount;
  state.totalSouls += amount;
}

export function buyProducer(state, producerId, amount = 1) {
  const producer = PRODUCER_DEFINITIONS.find(item => item.id === producerId);
  if (!producer) return 0;
  let bought = 0;
  while (bought < amount) {
    const cost = currentCost(producer, state);
    if (state.almas < cost) break;
    state.almas -= cost;
    state.producers[producerId] += 1;
    bought += 1;
  }
  return bought;
}

export function buyMaxProducer(state, producerId) {
  let bought = 0;
  while (buyProducer(state, producerId, 1) === 1) bought += 1;
  return bought;
}

export function buyUpgrade(state, upgradeId) {
  const upgrade = UPGRADE_DEFINITIONS.find(item => item.id === upgradeId);
  if (!upgrade || state.upgrades.includes(upgradeId) || !upgrade.unlock(state) || state.almas < upgrade.cost) return false;
  state.almas -= upgrade.cost;
  state.upgrades.push(upgradeId);
  return true;
}
