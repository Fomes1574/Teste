export const STAGE_BASE_WIDTH = 1280;
export const STAGE_BASE_HEIGHT = 720;
export const STAGE_DEBUG = true;
export const STAGE_DEBUG_TEXT = 'PHASER OK';
export const STAGE_DEBUG_BACKGROUND = '#102040';

export const STAGE_DEBUG_COLORS = {
  background: 0x102040,
  topLeft: 0xff2d4f,
  center: 0xffd681,
  right: 0x31d46b,
  border: 0xeaf6ff,
  text: '#ffffff'
};

export const STAGE_COLORS = {
  skyTop: 0x11172f,
  skyBottom: 0x17101d,
  bloodSkyTop: 0x2a0712,
  bloodSkyBottom: 0x3a0b16,
  moon: 0xf2d6a1,
  bloodMoon: 0xff5a66,
  ground: 0x273625,
  groundEdge: 0x5b3b29,
  combatZone: 0xff4966,
  soul: 0xa9f2ff,
  hero: 0xd7c09b,
  goblin: 0x68bb53,
  skeleton: 0xe6dcc4
};

export const STAGE_DEPTHS = {
  background: 0,
  terrain: 10,
  props: 20,
  units: 30,
  effects: 40
};

export const UNIT_POSITIONS = {
  hero: { x: 875, y: 500 },
  goblin: { x: 330, y: 510 },
  skeleton: { x: 500, y: 505 }
};
