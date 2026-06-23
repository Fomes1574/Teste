import { loadGame, saveGame, parseImportedSave, clearSave } from './systems/save.js';
import { applyOfflineProgress } from './systems/offline.js';
import { addSouls, buyMaxProducer, buyMilestoneUpgrade, buyProducer, buyUpgrade, clickPower, productionPerSecond } from './systems/economy.js';
import { maybeStartBloodMoon, BLOOD_MOON_CONFIG } from './systems/events.js';
import { render, renderProducerList, renderProducerStage, renderUpgradeList, showMessage, spawnFloatingText, updateResourceDisplays, updateStatistics, updateWorldVisuals, upgradeVisibilitySignature } from './systems/render.js';
import { formatNumber } from './utils/format.js';
import { createDefaultState } from './state.js';
import { markMilestoneSeen, newlyReachedMilestones, visualTierSignature } from './systems/milestones.js';

let state = loadGame();
const offline = applyOfflineProgress(state);
if (offline.gained > 0) showMessage(`Progresso offline: ${formatNumber(offline.gained)} Almas coletadas em ${Math.floor(offline.seconds / 60)} min.`);
saveGame(state);

let lastFrame = performance.now();
let eventAccumulator = 0;
const $ = id => document.getElementById(id);
let heroTimer = 0;
let lastUpgradeVisibility = '';
let wasBloodMoonActive = false;
let lastVisualTierSignature = '';

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
  wasBloodMoonActive = Date.now() < state.bloodMoonUntil;
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
    if (bought) { spawnSoulBurst(); refreshAfterStructuralChange('Produtor invocado. A presença dele agora aparece no cenário.', { producersChanged: true }); flashPurchasedCard(`[data-buy-producer="${producerId}"]`); }
  }
  if (maxProducerId) {
    const bought = buyMaxProducer(state, maxProducerId);
    if (bought) { spawnSoulBurst(); refreshAfterStructuralChange(`${bought} produtor(es) invocado(s).`, { producersChanged: true }); flashPurchasedCard(`[data-buy-max="${maxProducerId}"]`); }
  }
  if (upgradeId) {
    if (buyUpgrade(state, upgradeId)) { spawnSoulBurst(); refreshAfterStructuralChange('Upgrade comprado e aplicado ao ritual.'); flashPurchasedCard(`[data-buy-upgrade="${upgradeId}"]`); }
  }
  if (milestoneUpgradeId) {
    if (buyMilestoneUpgrade(state, milestoneUpgradeId)) { spawnSoulBurst(); refreshAfterStructuralChange('Upgrade de Marco comprado. A horda ficou mais forte.'); flashPurchasedCard(`[data-buy-milestone-upgrade="${milestoneUpgradeId}"]`); }
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
}

function spawnHero() {
  const lane = $('heroLane');
  const hero = document.createElement('div');
  hero.className = `pixel-hero ${Math.random() > 0.5 ? 'hero-knight' : 'hero-ranger'}`;
  lane.appendChild(hero);
  hero.addEventListener('animationend', () => {
    hero.classList.add('hero-soul');
    setTimeout(() => hero.remove(), 650);
  }, { once: true });
}

function loop(now) {
  const delta = Math.min((now - lastFrame) / 1000, 1);
  lastFrame = now;
  addSouls(state, productionPerSecond(state) * delta);
  eventAccumulator += delta;
  heroTimer += delta;
  if (heroTimer >= 4 + Math.random() * 4) {
    heroTimer = 0;
    spawnHero();
  }
  if (eventAccumulator >= BLOOD_MOON_CONFIG.checkEverySeconds) {
    const elapsed = eventAccumulator;
    eventAccumulator = 0;
    if (maybeStartBloodMoon(state, elapsed)) {
      showMessage('A Lua Sangrenta nasceu: produção dobrada por 20 segundos.');
      saveGame(state);
      updateWorldVisuals(state);
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
  }
  requestAnimationFrame(loop);
}

setInterval(() => saveGame(state), 5000);
render(state);
lastUpgradeVisibility = upgradeVisibilitySignature(state);
lastVisualTierSignature = visualTierSignature(state);
wasBloodMoonActive = Date.now() < state.bloodMoonUntil;
requestAnimationFrame(loop);
