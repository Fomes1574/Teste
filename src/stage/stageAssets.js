export const STAGE_ASSETS = {
  goblin: {
    idle: new URL('../../assets/sprites/goblin/goblin-tier1-idle.png', import.meta.url).href,
    attack: new URL('../../assets/sprites/goblin/goblin-tier1-attack.png', import.meta.url).href,
    frameWidth: 128,
    frameHeight: 128
  },
  skeleton: {
    idle: new URL('../../assets/sprites/skeleton/skeleton-tier1-idle.png', import.meta.url).href,
    attack: new URL('../../assets/sprites/skeleton/skeleton-tier1-attack.png', import.meta.url).href,
    frameWidth: 128,
    frameHeight: 128
  },
  knight: {
    walk: new URL('../../assets/sprites/heroes/hero-knight-walk.png', import.meta.url).href,
    hit: new URL('../../assets/sprites/heroes/hero-knight-hit.png', import.meta.url).href,
    frameWidth: 128,
    frameHeight: 128
  },
  witch: null,
  necromancer: null,
  gargoyle: null,
  demon: null,
  dragon: null
};

export const STAGE_ASSET_SUMMARY = {
  found: ['goblin', 'skeleton', 'knight'],
  missing: ['witch', 'necromancer', 'gargoyle', 'demon', 'dragon']
};
