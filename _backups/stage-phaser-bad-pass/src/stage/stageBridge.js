import { PRODUCER_DEFINITIONS } from '../data/producers.js';

export function toStageVisualState(state = {}) {
  const producers = { ...(state.producers || {}) };
  const hasProducer = id => (producers[id] || 0) > 0;
  return {
    souls: Number(state.almas || state.souls || 0),
    totalSouls: Number(state.totalSouls || 0),
    producers,
    producerVisuals: PRODUCER_DEFINITIONS.map(producer => ({
      id: producer.id,
      name: producer.name,
      quantity: producers[producer.id] || 0
    })),
    upgrades: Array.isArray(state.upgrades) ? [...state.upgrades] : [],
    milestoneUpgrades: Array.isArray(state.milestoneUpgrades) ? [...state.milestoneUpgrades] : [],
    totalClicks: Number(state.totalClicks || 0),
    bloodMoonActive: Date.now() < Number(state.bloodMoonUntil || 0),
    visualFlags: {
      bones: hasProducer('skeleton') && producers.skeleton >= 3,
      witchcraft: hasProducer('witch') || (Array.isArray(state.upgrades) && state.upgrades.some(id => id.includes('witch'))),
      necromancy: hasProducer('necromancer') || hasProducer('lich'),
      gargoyles: hasProducer('gargoyle'),
      bloodContracts: hasProducer('demon'),
      dragonShadow: hasProducer('dragon'),
      bloodMoon: Date.now() < Number(state.bloodMoonUntil || 0)
    }
  };
}
