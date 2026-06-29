import { PRODUCER_DEFINITIONS } from '../data/producers.js';
import { UPGRADE_DEFINITIONS } from '../data/upgrades.js';
import { BLOOD_MOON_CONFIG } from './events.js';
import { MILESTONE_UPGRADE_DEFINITIONS } from '../data/milestoneUpgrades.js';

export function currentCost(producer, state) {
  return producer.baseCost * Math.pow(producer.growth, state.producers[producer.id] || 0);
}

export function producerBulkCost(producer, state, amount) {
  const currentQuantity = state.producers[producer.id] || 0;
  let total = 0;
  for (let index = 0; index < amount; index += 1) {
    total += producer.baseCost * Math.pow(producer.growth, currentQuantity + index);
  }
  return total;
}

export function clickPower(state) {
  return 1 + UPGRADE_DEFINITIONS
    .filter(upgrade => upgrade.type === 'click' && state.upgrades.includes(upgrade.id))
    .reduce((sum, upgrade) => sum + upgrade.amount, 0);
}

function producerMultiplierFor(producer, state) {
  return UPGRADE_DEFINITIONS
    .filter(upgrade => upgrade.type === 'producer' && upgrade.producerId === producer.id && state.upgrades.includes(upgrade.id))
    .reduce((multiplier, upgrade) => multiplier * upgrade.multiplier, 1)
    * MILESTONE_UPGRADE_DEFINITIONS
      .filter(upgrade => upgrade.producerId === producer.id && state.milestoneUpgrades.includes(upgrade.id))
      .reduce((multiplier, upgrade) => multiplier * upgrade.multiplier, 1);
}

function globalProductionMultiplier(state) {
  return UPGRADE_DEFINITIONS
    .filter(upgrade => upgrade.type === 'global' && state.upgrades.includes(upgrade.id))
    .reduce((multiplier, upgrade) => multiplier * upgrade.multiplier, 1);
}

function bloodMoonMultiplier(state, now = Date.now()) {
  return now < state.bloodMoonUntil ? BLOOD_MOON_CONFIG.multiplier : 1;
}

export function producerProductionBreakdown(state, now = Date.now()) {
  const globalMultiplier = globalProductionMultiplier(state);
  const moonMultiplier = bloodMoonMultiplier(state, now);
  return PRODUCER_DEFINITIONS.map(producer => {
    const quantity = state.producers[producer.id] || 0;
    const producerMultiplier = producerMultiplierFor(producer, state);
    const baseProduction = quantity * producer.production;
    return {
      id: producer.id,
      name: producer.name,
      quantity,
      baseProduction,
      producerMultiplier,
      globalMultiplier,
      bloodMoonMultiplier: moonMultiplier,
      totalProduction: baseProduction * producerMultiplier * globalMultiplier * moonMultiplier
    };
  });
}

export function productionPerSecond(state, now = Date.now()) {
  return producerProductionBreakdown(state, now)
    .reduce((total, producer) => total + producer.totalProduction, 0);
}

export function addSouls(state, amount, source = 'unknown') {
  state.almas += amount;
  state.totalSouls += amount;
  if (!state.stats) {
    state.stats = { ritualClicks: 0, soulsFromClicks: 0, soulsFromProduction: 0 };
  }
  if (source === 'click') state.stats.soulsFromClicks += amount;
  if (source === 'production') state.stats.soulsFromProduction += amount;
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

export function buyMilestoneUpgrade(state, upgradeId) {
  const upgrade = MILESTONE_UPGRADE_DEFINITIONS.find(item => item.id === upgradeId);
  if (!upgrade || state.milestoneUpgrades.includes(upgradeId) || !upgrade.unlock(state) || state.almas < upgrade.cost) return false;
  state.almas -= upgrade.cost;
  state.milestoneUpgrades.push(upgradeId);
  return true;
}
