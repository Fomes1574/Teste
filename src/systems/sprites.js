export const SPRITE_VERSION = 'v037b';
export const HERO_SPRITE_DIR = 'assets/sprites/heroes';

export const SPRITE_PATHS = {
  goblinIdle: 'assets/sprites/goblin/goblin-tier1-idle.png',
  goblinAttack: 'assets/sprites/goblin/goblin-tier1-attack.png',
  skeletonIdle: 'assets/sprites/skeleton/skeleton-tier1-idle.png',
  skeletonAttack: 'assets/sprites/skeleton/skeleton-tier1-attack.png',
  heroKnightWalk: `${HERO_SPRITE_DIR}/hero-knight-walk.png`,
  heroKnightHit: `${HERO_SPRITE_DIR}/hero-knight-hit.png`
};

const availableSprites = new Set();
let preloadPromise;

function versioned(path) {
  return `${path}?v=${SPRITE_VERSION}`;
}

function loadSprite([key, path]) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      console.info(`[sprites] carregado: ${path}`);
      availableSprites.add(key);
      resolve({ key, path, ok: true });
    };
    image.onerror = () => {
      console.info(`[sprites] Asset ausente, usando fallback: ${path}`);
      resolve({ key, path, ok: false });
    };
    image.src = versioned(path);
  });
}

export function preloadSprites(spritePaths = SPRITE_PATHS) {
  preloadPromise ||= Promise.all(Object.entries(spritePaths).map(loadSprite));
  return preloadPromise;
}

export function hasSprite(key) {
  return availableSprites.has(key);
}

export function producerSpriteKeys(producerId) {
  if (producerId === 'goblin') return { idle: 'goblinIdle', attack: 'goblinAttack' };
  if (producerId === 'skeleton') return { idle: 'skeletonIdle', attack: 'skeletonAttack' };
  return null;
}
