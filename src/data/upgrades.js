// v0.2 balance: altere custos, descrições, efeitos e desbloqueios neste arquivo.
export const UPGRADE_DEFINITIONS = [
  { id: 'cursed_finger', name: 'Dedo Maldito', cost: 50, type: 'click', amount: 1, description: '+1 Alma por clique.', unlock: s => s.totalSouls >= 25 },
  { id: 'profane_touch', name: 'Toque Profano', cost: 500, type: 'click', amount: 5, description: '+5 Almas por clique.', unlock: s => s.totalSouls >= 250 },
  { id: 'abyss_hand', name: 'Mão do Abismo', cost: 5000, type: 'click', amount: 10, description: '+10 Almas por clique.', unlock: s => s.totalSouls >= 2500 },
  { id: 'bone_throne', name: 'Trono de Ossos', cost: 2500, type: 'global', multiplier: 1.25, description: 'Toda produção recebe +25%.', unlock: s => Object.values(s.producers).reduce((a, b) => a + b, 0) >= 10 },
  { id: 'red_moon', name: 'Lua Vermelha', cost: 25000, type: 'global', multiplier: 1.5, description: 'Toda produção recebe +50%.', unlock: s => s.totalSouls >= 10000 },
  { id: 'profane_castle', name: 'Castelo Profano', cost: 250000, type: 'global', multiplier: 2, description: 'Toda produção é dobrada.', unlock: s => s.totalSouls >= 100000 },
  { id: 'goblin_whips', name: 'Chicotes Goblins', cost: 500, type: 'producer', producerId: 'goblin', multiplier: 2, description: 'Goblins produzem 2x.', unlock: s => s.producers.goblin >= 10 },
  { id: 'sharp_bones', name: 'Ossos Afiados', cost: 5000, type: 'producer', producerId: 'skeleton', multiplier: 2, description: 'Esqueletos produzem 2x.', unlock: s => s.producers.skeleton >= 10 },
  { id: 'dark_cauldron', name: 'Caldeirão Sombrio', cost: 55000, type: 'producer', producerId: 'witch', multiplier: 2, description: 'Bruxas produzem 2x.', unlock: s => s.producers.witch >= 10 },
  { id: 'minor_grimoire', name: 'Grimório Menor', cost: 600000, type: 'producer', producerId: 'necromancer', multiplier: 2, description: 'Necromantes produzem 2x.', unlock: s => s.producers.necromancer >= 10 },
  { id: 'stone_wings', name: 'Asas de Pedra', cost: 6500000, type: 'producer', producerId: 'gargoyle', multiplier: 2, description: 'Gárgulas produzem 2x.', unlock: s => s.producers.gargoyle >= 10 },
  { id: 'flaming_pact', name: 'Pacto Flamejante', cost: 70000000, type: 'producer', producerId: 'demon', multiplier: 2, description: 'Demônios produzem 2x.', unlock: s => s.producers.demon >= 10 }
  // TODO: futuro upgrade "Chama Azul Ritualística" e bônus "Surto da Chama Azul".
];
