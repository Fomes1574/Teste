import { PRODUCER_DEFINITIONS } from '../data/producers.js';

export function toStageVisualState(state = {}) {
  const producers = { ...(state.producers || {}) };
  const hasProducer = id => (producers[id] || 0) > 0;
  const upgradeIds = [
    ...(Array.isArray(state.upgrades) ? state.upgrades : []),
    ...(Array.isArray(state.milestoneUpgrades) ? state.milestoneUpgrades : [])
  ];
  const hasUpgradeLike = (...parts) => upgradeIds.some(id => parts.some(part => String(id).toLowerCase().includes(part)));
  const bloodMoonActive = Date.now() < Number(state.bloodMoonUntil || 0);
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
    bloodMoonActive,
    visualFlags: {
      hasGoblins: hasProducer('goblin'),
      hasSkeletons: hasProducer('skeleton'),
      hasWitches: hasProducer('witch'),
      hasNecromancers: hasProducer('necromancer'),
      hasGargoyles: hasProducer('gargoyle'),
      hasDemons: hasProducer('demon'),
      hasDragon: hasProducer('dragon'),
      bones: hasProducer('skeleton') && (producers.skeleton >= 3 || hasUpgradeLike('skeleton', 'bone', 'osso')),
      witchcraft: hasProducer('witch') || hasUpgradeLike('witch', 'bruxa', 'rune', 'runa'),
      necromancy: hasProducer('necromancer') || hasProducer('lich'),
      gargoyles: hasProducer('gargoyle'),
      bloodContracts: hasProducer('demon'),
      dragonShadow: hasProducer('dragon'),
      bloodMoon: bloodMoonActive
    }
  };
}
