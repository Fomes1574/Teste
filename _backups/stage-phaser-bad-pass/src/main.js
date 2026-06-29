import { loadGame, saveGame, parseImportedSave, clearSave } from './systems/save.js';
import { applyOfflineProgress } from './systems/offline.js';
import { addSouls, buyMaxProducer, buyMilestoneUpgrade, buyProducer, buyUpgrade, clickPower, productionPerSecond } from './systems/economy.js';
import { maybeStartBloodMoon, BLOOD_MOON_CONFIG } from './systems/events.js';
import { render, renderProducerList, renderProducerStage, renderUpgradeList, showMessage, spawnFloatingText, updateResourceDisplays, updateStatistics, updateWorldVisuals, upgradeVisibilitySignature } from './systems/render.js';
import { formatNumber } from './utils/format.js';
import { createDefaultState } from './state.js';
import { markMilestoneSeen, newlyReachedMilestones, visualTierSignature } from './systems/milestones.js';
import { hasSprite, preloadSprites } from './systems/sprites.js';
import { emitPurchase, emitRitualClick, initStageGame, syncStageState } from './stage/stageGame.js';

let state = loadGame();
const offline = applyOfflineProgress(state);
if (offline.gained > 0) showMessage(`Progresso offline: ${formatNumber(offline.gained)} Almas coletadas em ${Math.floor(offline.seconds / 60)} min.`);
saveGame(state);
preloadSprites().then(() => {
  renderProducerStage(state);
  scheduleHeroRespawn(700, 700);
});

let lastFrame = performance.now();
let eventAccumulator = 0;
const $ = id => document.getElementById(id);
let nextHeroSpawnAt = Number.POSITIVE_INFINITY;
let lastVisualAttacker = 'skeleton';
let lastUpgradeVisibility = '';
let wasBloodMoonActive = false;
let lastVisualTierSignature = '';
const DEBUG_COMBAT = false;

function syncLiveStage() {
  syncStageState(state);
}

function handleReachedMilestones() {
  const reached = newlyReachedMilestones(state);
  for (const milestone of reached) {
    markMilestoneSeen(state, milestone.id);
    showMessage(`Marco alcançado: ${milestone.milestone}. ${milestone.name} foi desbloqueado.`);
    spawnSoulBurst();
  }
  return reached.length > 0;
}

function refreshAfterStructuralChange(message, { producersChanged = false } = {}) {
  const milestoneReached = handleReachedMilestones();
  if (message && !milestoneReached) showMessage(message);
  saveGame(state);
  updateResourceDisplays(state);
  updateStatistics(state);
  updateWorldVisuals(state);
  renderProducerList(state);
  renderUpgradeList(state);
  const visualSignature = visualTierSignature(state);
  if (producersChanged && visualSignature !== lastVisualTierSignature) {
    renderProducerStage(state);
    lastVisualTierSignature = visualSignature;
  }
  lastUpgradeVisibility = upgradeVisibilitySignature(state);
  if (!hasCombatPresence(state)) clearActiveHeroes();
  else scheduleHeroRespawn(700, 1100);
  wasBloodMoonActive = Date.now() < state.bloodMoonUntil;
  syncLiveStage();
}

function flashPurchasedCard(selector) {
  const card = document.querySelector(selector)?.closest('.game-card');
  if (!card) return;
  card.classList.add('purchase-flash');
  setTimeout(() => card.classList.remove('purchase-flash'), 450);
}

$('ritualButton').addEventListener('click', event => {
  const gained = clickPower(state);
  addSouls(state, gained);
  state.totalClicks += 1;
  document.body.classList.add('ritual-shock');
  $('ritualButton').classList.add('clicked');
  spawnFloatingText(`+${formatNumber(gained)} Alma`, event.clientX, event.clientY);
  setTimeout(() => document.body.classList.remove('ritual-shock'), 260);
  setTimeout(() => $('ritualButton').classList.remove('clicked'), 360);
  saveGame(state);
  updateResourceDisplays(state);
  updateStatistics(state);
  updateWorldVisuals(state);
  syncLiveStage();
  emitRitualClick({
    gained,
    totalClicks: state.totalClicks
  });
});

document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-button,.tab-panel').forEach(element => element.classList.remove('active'));
    button.classList.add('active');
    $(button.dataset.tab).classList.add('active');
  });
});

document.addEventListener('click', event => {
  const action = event.target.closest('[data-buy-producer], [data-buy-max], [data-buy-upgrade], [data-buy-milestone-upgrade]');
  if (!action) return;
  const producerId = action.dataset.buyProducer;
  const buyAmount = Number(action.dataset.buyAmount || 1);
  const maxProducerId = action.dataset.buyMax;
  const upgradeId = action.dataset.buyUpgrade;
  const milestoneUpgradeId = action.dataset.buyMilestoneUpgrade;
  if (producerId) {
    const bought = buyProducer(state, producerId, buyAmount);
    if (bought) { spawnSoulBurst(); refreshAfterStructuralChange('Produtor invocado. A presença dele agora aparece no cenário.', { producersChanged: true }); pulseStageUnit(producerId); flashPurchasedCard(`[data-buy-producer="${producerId}"]`); emitPurchase({ type: 'producer', id: producerId }); }
  }
  if (maxProducerId) {
    const bought = buyMaxProducer(state, maxProducerId);
    if (bought) { spawnSoulBurst(); refreshAfterStructuralChange(`${bought} produtor(es) invocado(s).`, { producersChanged: true }); pulseStageUnit(maxProducerId); flashPurchasedCard(`[data-buy-max="${maxProducerId}"]`); emitPurchase({ type: 'producer', id: maxProducerId }); }
  }
  if (upgradeId) {
    if (buyUpgrade(state, upgradeId)) { spawnSoulBurst(); refreshAfterStructuralChange('Upgrade comprado e aplicado ao ritual.'); flashPurchasedCard(`[data-buy-upgrade="${upgradeId}"]`); emitPurchase({ type: 'upgrade', id: upgradeId }); }
  }
  if (milestoneUpgradeId) {
    if (buyMilestoneUpgrade(state, milestoneUpgradeId)) { spawnSoulBurst(); refreshAfterStructuralChange('Upgrade de Marco comprado. A horda ficou mais forte.'); flashPurchasedCard(`[data-buy-milestone-upgrade="${milestoneUpgradeId}"]`); emitPurchase({ type: 'milestoneUpgrade', id: milestoneUpgradeId }); }
  }
});

$('exportSave').addEventListener('click', () => {
  saveGame(state);
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'imperio-de-monstros-v03-save.json' });
  link.click();
  URL.revokeObjectURL(link.href);
  showMessage('Save exportado como arquivo JSON.');
});

$('importSave').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const imported = parseImportedSave(reader.result);
    if (!imported) {
      showMessage('Save inválido. Importação cancelada.');
      return;
    }
    state = imported;
    refreshAfterStructuralChange('Save importado com sucesso.', { producersChanged: true });
  };
  reader.readAsText(file);
  event.target.value = '';
});

$('resetSave').addEventListener('click', () => {
  if (!confirm('Resetar definitivamente o save de Império de Monstros?')) return;
  clearSave();
  state = createDefaultState();
  refreshAfterStructuralChange('Save resetado. O império recomeçou do zero.', { producersChanged: true });
});

function spawnSoulBurst() {
  const ritual = $('ritualButton').getBoundingClientRect();
  spawnFloatingText('ALMA', ritual.left + ritual.width / 2, ritual.top + ritual.height / 2);
  spawnStageBurst();
}

function spawnStageBurst() {
  const layer = $('stageEffectsLayer');
  if (!layer) return;
  const burst = document.createElement('div');
  burst.className = 'stage-burst';
  layer.appendChild(burst);
  setTimeout(() => burst.remove(), 750);
}

function debugCombat(...args) {
  if (DEBUG_COMBAT) console.info('[combat]', ...args);
}

function waitAnimationOrTimeout(element, expectedAnimationName, timeoutMs) {
  return new Promise(resolve => {
    if (!element) {
      resolve({ completed: false, timedOut: true });
      return;
    }
    let settled = false;
    let timeoutId;
    const finish = result => {
      if (settled) return;
      settled = true;
      element.removeEventListener('animationend', onAnimationEnd);
      clearTimeout(timeoutId);
      resolve(result);
    };
    const onAnimationEnd = event => {
      if (event.target !== element) return;
      if (expectedAnimationName && event.animationName !== expectedAnimationName) return;
      finish({ completed: true, timedOut: false });
    };
    element.addEventListener('animationend', onAnimationEnd);
    timeoutId = setTimeout(() => finish({ completed: false, timedOut: true }), timeoutMs);
  });
}

function hasCombatPresence(currentState) {
  return (currentState.producers.goblin || 0) > 0 || (currentState.producers.skeleton || 0) > 0;
}

function activeHero() {
  return document.querySelector('.stage-hero[data-state="walking"], .stage-hero[data-state="fighting"], .stage-hero[data-state="hit"], .stage-hero[data-state="soul"]');
}

function clearActiveHeroes() {
  document.querySelectorAll('.stage-hero').forEach(hero => hero.remove());
  nextHeroSpawnAt = Number.POSITIVE_INFINITY;
}

function scheduleHeroRespawn(minDelay = 2500, maxDelay = 4000) {
  if (!hasCombatPresence(state)) {
    nextHeroSpawnAt = Number.POSITIVE_INFINITY;
    return;
  }
  if (activeHero()) return;
  const delay = minDelay + Math.random() * Math.max(0, maxDelay - minDelay);
  nextHeroSpawnAt = Math.min(nextHeroSpawnAt, performance.now() + delay);
}

function chooseVisualAttacker(currentState) {
  const goblinAvailable = (currentState.producers.goblin || 0) > 0 && document.querySelector('[data-producer-visual="goblin"]');
  const skeletonAvailable = (currentState.producers.skeleton || 0) > 0 && document.querySelector('[data-producer-visual="skeleton"]');
  if (goblinAvailable && !skeletonAvailable) return 'goblin';
  if (skeletonAvailable && !goblinAvailable) return 'skeleton';
  if (goblinAvailable && skeletonAvailable) {
    lastVisualAttacker = lastVisualAttacker === 'goblin' ? 'skeleton' : 'goblin';
    return lastVisualAttacker;
  }
  return null;
}

const attackAnimationNames = {
  goblin: { frame: 'spriteGoblinAttack', motion: 'goblinLunge' },
  skeleton: { frame: 'spriteSkeletonAttack', motion: 'skeletonLunge' }
};

async function pulseStageUnit(producerId) {
  const unit = document.querySelector(`[data-producer-visual="${producerId}"]`);
  if (!unit) return false;
  unit.classList.add('unit-attack-pulse');
  if (unit.dataset.renderer !== 'sprite-sheet' || !attackAnimationNames[producerId]) {
    await waitAnimationOrTimeout(unit, null, 520);
    unit.classList.remove('unit-attack-pulse');
    return true;
  }

  const layer = unit.querySelector('.sprite-sheet-layer');
  const motion = unit.querySelector('.sprite-motion');
  const names = attackAnimationNames[producerId];
  if (!layer || !motion) {
    unit.classList.remove('unit-attack-pulse');
    return false;
  }

  unit.classList.remove('attacking');
  unit.dataset.state = 'idle';
  void unit.offsetWidth;
  unit.dataset.state = 'attacking';
  unit.classList.add('attacking');
  debugCombat('unit attack started', producerId);

  const [frameResult, motionResult] = await Promise.allSettled([
    waitAnimationOrTimeout(layer, names.frame, 750),
    waitAnimationOrTimeout(motion, names.motion, 750)
  ]);
  debugCombat('unit attack finished', producerId, frameResult.value, motionResult.value);

  unit.classList.remove('attacking');
  unit.dataset.state = 'returning';
  await waitAnimationOrTimeout(motion, 'returnSettle', 450);
  unit.dataset.state = 'idle';
  unit.classList.remove('unit-attack-pulse');
  return true;
}

function createHeroElement() {
  const hero = document.createElement('div');
  const useKnightSprite = hasSprite('heroKnightWalk');
  const isKnight = useKnightSprite || Math.random() > 0.5;
  hero.className = `stage-hero pixel-hero ${isKnight ? 'hero-knight' : 'hero-ranger'} ${useKnightSprite ? 'sprite-sheet-unit sprite-hero-knight' : ''} state-walking`;
  hero.dataset.renderer = useKnightSprite ? 'sprite-sheet' : 'fallback';
  hero.dataset.state = 'walking';
  hero.dataset.spawnedAt = String(performance.now());
  hero.innerHTML = useKnightSprite
    ? '<div class="sprite-motion"><div class="sprite-viewport"><div class="sprite-sheet-layer" aria-hidden="true"></div></div></div>'
    : isKnight
      ? '<div class="sprite hero-knight-sprite"><span class="helmet"></span><span class="face"></span><span class="body"></span><span class="sword"></span><span class="shield"></span><span class="leg left"></span><span class="leg right"></span></div>'
      : '<div class="sprite hero-ranger-sprite"><span class="hood"></span><span class="face"></span><span class="body"></span><span class="bow"></span><span class="arrow"></span><span class="leg left"></span><span class="leg right"></span></div>';
  hero.addEventListener('animationend', onHeroAnimationEnd);
  return hero;
}

function cleanupStaleHeroes() {
  const now = performance.now();
  let removed = false;
  document.querySelectorAll('.stage-hero').forEach(hero => {
    const spawnedAt = Number(hero.dataset.spawnedAt || now);
    if (now - spawnedAt > 8000) {
      debugCombat('removing stale hero', hero.dataset.state);
      hero.dataset.state = 'removed';
      hero.remove();
      removed = true;
    }
  });
  return removed;
}

function trySpawnHero() {
  if (!hasCombatPresence(state)) return false;
  if (cleanupStaleHeroes()) {
    scheduleHeroRespawn(2500, 4000);
    return false;
  }
  if (activeHero()) return false;
  const lane = $('heroLane');
  if (!lane) return false;
  lane.appendChild(createHeroElement());
  nextHeroSpawnAt = Number.POSITIVE_INFINITY;
  debugCombat('hero spawned');
  return true;
}

function onHeroAnimationEnd(event) {
  const hero = event.currentTarget;
  if (event.target !== hero || event.animationName !== 'heroSideWalk' || hero.dataset.state !== 'walking') return;
  debugCombat('hero arrived');
  const attacker = chooseVisualAttacker(state);
  if (!attacker) {
    hero.dataset.state = 'removed';
    hero.remove();
    if (hasCombatPresence(state)) scheduleHeroRespawn(2500, 4000);
    return;
  }
  debugCombat('attacker chosen', attacker);
  hero.dataset.state = 'fighting';
  hero.dataset.combatResolved = 'false';
  hero.classList.remove('state-walking');
  runHeroCombatSequence(hero, attacker);
}

async function runHeroCombatSequence(hero, attacker) {
  let timeoutId;
  const resolveCombat = reason => {
    if (!hero.isConnected || hero.dataset.state !== 'fighting' || hero.dataset.combatResolved === 'true') return;
    hero.dataset.combatResolved = 'true';
    clearTimeout(timeoutId);
    debugCombat(reason === 'timeout' ? 'combat timeout fallback' : 'attack finished', attacker);
    startHeroHit(hero);
  };
  timeoutId = setTimeout(() => resolveCombat('timeout'), 1200);
  await pulseStageUnit(attacker);
  resolveCombat('attack');
}

async function startHeroHit(hero) {
  if (!hero.isConnected || hero.dataset.state === 'soul' || hero.dataset.state === 'removed') return;
  hero.dataset.state = 'hit';
  hero.classList.add('state-hit');
  debugCombat('hero hit');
  const layer = hero.querySelector('.sprite-sheet-layer');
  if (layer && hero.dataset.renderer === 'sprite-sheet' && hasSprite('heroKnightHit')) {
    await waitAnimationOrTimeout(layer, 'spriteHeroHit', 850);
  } else {
    await waitAnimationOrTimeout(hero, null, 180);
  }
  beginHeroSoul(hero);
}

async function beginHeroSoul(hero) {
  if (!hero.isConnected) return;
  hero.dataset.state = 'soul';
  hero.classList.add('hero-soul');
  await waitAnimationOrTimeout(hero, 'heroSoulRise', 950);
  if (!hero.isConnected) return;
  hero.dataset.state = 'removed';
  hero.remove();
  debugCombat('hero soul removed');
  if (hasCombatPresence(state)) scheduleHeroRespawn(2500, 4000);
}

function loop(now) {
  const delta = Math.min((now - lastFrame) / 1000, 1);
  lastFrame = now;
  addSouls(state, productionPerSecond(state) * delta);
  eventAccumulator += delta;
  if (now >= nextHeroSpawnAt) {
    trySpawnHero();
  }
  if (eventAccumulator >= BLOOD_MOON_CONFIG.checkEverySeconds) {
    const elapsed = eventAccumulator;
    eventAccumulator = 0;
    if (maybeStartBloodMoon(state, elapsed)) {
      showMessage('A Lua Sangrenta nasceu: produção dobrada por 20 segundos.');
      saveGame(state);
      updateWorldVisuals(state);
      syncLiveStage();
    }
  }
  updateResourceDisplays(state);
  const visibility = upgradeVisibilitySignature(state);
  if (visibility !== lastUpgradeVisibility) {
    renderUpgradeList(state);
    lastUpgradeVisibility = visibility;
  }
  const bloodMoonActive = Date.now() < state.bloodMoonUntil;
  if (bloodMoonActive !== wasBloodMoonActive) {
    updateWorldVisuals(state);
    wasBloodMoonActive = bloodMoonActive;
    syncLiveStage();
  }
  requestAnimationFrame(loop);
}

setInterval(() => saveGame(state), 5000);
render(state);
void initStageGame({ containerId: 'phaserStageHost', getState: () => state }).then(() => syncLiveStage());
syncLiveStage();
lastUpgradeVisibility = upgradeVisibilitySignature(state);
lastVisualTierSignature = visualTierSignature(state);
wasBloodMoonActive = Date.now() < state.bloodMoonUntil;
requestAnimationFrame(loop);
