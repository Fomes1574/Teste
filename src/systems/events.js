// v0.2: altere chance, duração, frequência e multiplicador visual da Lua Sangrenta aqui.
export const BLOOD_MOON_CONFIG = {
  checkEverySeconds: 30,
  chance: 0.12,
  durationSeconds: 20,
  multiplier: 2
};

export function isBloodMoonActive(state, now = Date.now()) {
  return now < state.bloodMoonUntil;
}

export function maybeStartBloodMoon(state, elapsedCheckSeconds, now = Date.now()) {
  if (elapsedCheckSeconds < BLOOD_MOON_CONFIG.checkEverySeconds || isBloodMoonActive(state, now)) return false;
  if (Math.random() >= BLOOD_MOON_CONFIG.chance) return false;
  state.bloodMoonUntil = now + BLOOD_MOON_CONFIG.durationSeconds * 1000;
  return true;
}
