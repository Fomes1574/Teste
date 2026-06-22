import { loadGame, saveGame, parseImportedSave, clearSave } from './systems/save.js';
import { applyOfflineProgress } from './systems/offline.js';
import { addSouls, buyMaxProducer, buyProducer, buyUpgrade, clickPower, productionPerSecond } from './systems/economy.js';
import { maybeStartBloodMoon, BLOOD_MOON_CONFIG } from './systems/events.js';
import { render, showMessage, spawnFloatingText } from './systems/render.js';
import { formatNumber } from './utils/format.js';
import { createDefaultState } from './state.js';

let state = loadGame();
const offline = applyOfflineProgress(state);
if (offline.gained > 0) showMessage(`Progresso offline: ${formatNumber(offline.gained)} Almas coletadas em ${Math.floor(offline.seconds / 60)} min.`);
saveGame(state);

let lastFrame = performance.now();
let eventAccumulator = 0;
const $ = id => document.getElementById(id);

function persistAndRender(message) {
  if (message) showMessage(message);
  saveGame(state);
  render(state);
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
  persistAndRender();
});

document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-button,.tab-panel').forEach(element => element.classList.remove('active'));
    button.classList.add('active');
    $(button.dataset.tab).classList.add('active');
  });
});

document.addEventListener('click', event => {
  const producerId = event.target.dataset.buyProducer;
  const maxProducerId = event.target.dataset.buyMax;
  const upgradeId = event.target.dataset.buyUpgrade;
  if (producerId) {
    const bought = buyProducer(state, producerId);
    if (bought) persistAndRender('Produtor invocado. A presença dele agora aparece no cenário.');
  }
  if (maxProducerId) {
    const bought = buyMaxProducer(state, maxProducerId);
    if (bought) persistAndRender(`${bought} produtor(es) invocado(s).`);
  }
  if (upgradeId) {
    if (buyUpgrade(state, upgradeId)) persistAndRender('Upgrade comprado e aplicado ao ritual.');
  }
});

$('exportSave').addEventListener('click', () => {
  saveGame(state);
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'imperio-de-monstros-v02-save.json' });
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
    persistAndRender('Save importado com sucesso.');
  };
  reader.readAsText(file);
  event.target.value = '';
});

$('resetSave').addEventListener('click', () => {
  if (!confirm('Resetar definitivamente o save de Império de Monstros?')) return;
  clearSave();
  state = createDefaultState();
  persistAndRender('Save resetado. O império recomeçou do zero.');
});

function loop(now) {
  const delta = Math.min((now - lastFrame) / 1000, 1);
  lastFrame = now;
  addSouls(state, productionPerSecond(state) * delta);
  eventAccumulator += delta;
  if (eventAccumulator >= BLOOD_MOON_CONFIG.checkEverySeconds) {
    const elapsed = eventAccumulator;
    eventAccumulator = 0;
    if (maybeStartBloodMoon(state, elapsed)) persistAndRender('A Lua Sangrenta nasceu: produção dobrada por 20 segundos.');
  }
  render(state);
  requestAnimationFrame(loop);
}

setInterval(() => saveGame(state), 5000);
render(state);
requestAnimationFrame(loop);
