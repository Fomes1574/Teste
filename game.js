// Império de Monstros - edite produtores em PRODUCER_DEFINITIONS e upgrades em UPGRADE_DEFINITIONS.
// Edite OFFLINE_LIMIT_SECONDS para alterar o limite offline inicial.
// Edite BLOOD_MOON_CONFIG para alterar chance, duração e multiplicador da Lua Sangrenta.

const PRODUCER_DEFINITIONS = [
  { id: 'goblin', name: 'Goblin Coletor', baseCost: 15, production: 0.1, growth: 1.15 },
  { id: 'skeleton', name: 'Esqueleto Guardião', baseCost: 100, production: 1, growth: 1.15 },
  { id: 'witch', name: 'Bruxa Aprendiz', baseCost: 1100, production: 8, growth: 1.15 },
  { id: 'necromancer', name: 'Necromante Subalterno', baseCost: 12000, production: 47, growth: 1.15 },
  { id: 'gargoyle', name: 'Gárgula Vigia', baseCost: 130000, production: 260, growth: 1.15 },
  { id: 'demon', name: 'Demônio Contratual', baseCost: 1400000, production: 1400, growth: 1.15 },
  { id: 'dragon', name: 'Dragão Espectral', baseCost: 20000000, production: 7800, growth: 1.15 },
  { id: 'portal', name: 'Portal Infernal', baseCost: 330000000, production: 44000, growth: 1.15 },
  { id: 'lich', name: 'Lich Ancestral', baseCost: 5100000000, production: 260000, growth: 1.15 },
  { id: 'god', name: 'Deus Aprisionado', baseCost: 75000000000, production: 1800000, growth: 1.15 }
];

const UPGRADE_DEFINITIONS = [
  { id: 'cursed_finger', name: 'Dedo Maldito', cost: 50, type: 'click', amount: 1, unlock: s => s.totalSouls >= 25 },
  { id: 'profane_touch', name: 'Toque Profano', cost: 500, type: 'click', amount: 5, unlock: s => s.totalSouls >= 250 },
  { id: 'abyss_hand', name: 'Mão do Abismo', cost: 5000, type: 'click', amount: 10, unlock: s => s.totalSouls >= 2500 },
  { id: 'bone_throne', name: 'Trono de Ossos', cost: 2500, type: 'global', multiplier: 1.25, unlock: s => totalProducers(s) >= 10 },
  { id: 'red_moon', name: 'Lua Vermelha', cost: 25000, type: 'global', multiplier: 1.5, unlock: s => s.totalSouls >= 10000 },
  { id: 'profane_castle', name: 'Castelo Profano', cost: 250000, type: 'global', multiplier: 2, unlock: s => s.totalSouls >= 100000 },
  { id: 'goblin_whips', name: 'Chicotes Goblins', cost: 500, type: 'producer', producerId: 'goblin', multiplier: 2, unlock: s => s.producers.goblin >= 10 },
  { id: 'sharp_bones', name: 'Ossos Afiados', cost: 5000, type: 'producer', producerId: 'skeleton', multiplier: 2, unlock: s => s.producers.skeleton >= 10 },
  { id: 'dark_cauldron', name: 'Caldeirão Sombrio', cost: 55000, type: 'producer', producerId: 'witch', multiplier: 2, unlock: s => s.producers.witch >= 10 },
  { id: 'minor_grimoire', name: 'Grimório Menor', cost: 600000, type: 'producer', producerId: 'necromancer', multiplier: 2, unlock: s => s.producers.necromancer >= 10 },
  { id: 'stone_wings', name: 'Asas de Pedra', cost: 6500000, type: 'producer', producerId: 'gargoyle', multiplier: 2, unlock: s => s.producers.gargoyle >= 10 },
  { id: 'flaming_pact', name: 'Pacto Flamejante', cost: 70000000, type: 'producer', producerId: 'demon', multiplier: 2, unlock: s => s.producers.demon >= 10 }
  // TODO: adicionar upgrade futuro "Chama Azul Ritualística" e bônus "Surto da Chama Azul".
];

const SAVE_KEY = 'imperioDeMonstrosSave';
const OFFLINE_LIMIT_SECONDS = 60 * 60 * 2;
const BLOOD_MOON_CONFIG = { checkEverySeconds: 30, chance: 0.12, durationSeconds: 20, multiplier: 2 };

const defaultState = () => ({
  almas: 0,
  chamasAzuis: 0,
  producers: Object.fromEntries(PRODUCER_DEFINITIONS.map(p => [p.id, 0])),
  upgrades: [],
  totalSouls: 0,
  totalClicks: 0,
  lastSave: Date.now(),
  bloodMoonUntil: 0
});

let state = loadGame();
let lastFrame = performance.now();
let bloodMoonCheck = 0;
const $ = id => document.getElementById(id);

function totalProducers(s = state) { return Object.values(s.producers).reduce((a, b) => a + b, 0); }
function currentCost(p) { return p.baseCost * Math.pow(p.growth, state.producers[p.id]); }
function hasUpgrade(id) { return state.upgrades.includes(id); }
function format(n) { return n < 1000 ? n.toFixed(n < 10 ? 1 : 0) : Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 2 }).format(n); }

function clickPower() {
  return 1 + UPGRADE_DEFINITIONS.filter(u => u.type === 'click' && hasUpgrade(u.id)).reduce((sum, u) => sum + u.amount, 0);
}

function productionPerSecond(targetState = state) {
  const ownsUpgrade = id => targetState.upgrades.includes(id);
  let total = 0;
  for (const p of PRODUCER_DEFINITIONS) {
    const producerBoost = UPGRADE_DEFINITIONS.filter(u => u.type === 'producer' && u.producerId === p.id && ownsUpgrade(u.id)).reduce((m, u) => m * u.multiplier, 1);
    total += targetState.producers[p.id] * p.production * producerBoost;
  }
  total *= UPGRADE_DEFINITIONS.filter(u => u.type === 'global' && ownsUpgrade(u.id)).reduce((m, u) => m * u.multiplier, 1);
  if (Date.now() < targetState.bloodMoonUntil) total *= BLOOD_MOON_CONFIG.multiplier;
  return total;
}

function gainSouls(amount) { state.almas += amount; state.totalSouls += amount; }

function saveGame() { state.lastSave = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
function loadGame() {
  const loaded = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  const merged = { ...defaultState(), ...(loaded || {}) };
  const offlineSeconds = Math.min((Date.now() - (merged.lastSave || Date.now())) / 1000, OFFLINE_LIMIT_SECONDS);
  if (loaded && offlineSeconds > 5) {
    const gained = productionPerSecond(merged) * offlineSeconds;
    merged.almas += gained; merged.totalSouls += gained;
    setTimeout(() => showMessage(`Você coletou ${format(gained)} Almas enquanto estava ausente.`), 250);
  }
  return merged;
}
function buyProducer(id) {
  const p = PRODUCER_DEFINITIONS.find(x => x.id === id);
  const cost = currentCost(p);
  if (state.almas < cost) return;
  state.almas -= cost; state.producers[id] += 1; saveGame(); render();
}

function buyUpgrade(id) {
  const u = UPGRADE_DEFINITIONS.find(x => x.id === id);
  if (!u || hasUpgrade(id) || state.almas < u.cost || !u.unlock(state)) return;
  state.almas -= u.cost; state.upgrades.push(id); saveGame(); render();
}

function render() {
  $('soulsDisplay').textContent = format(state.almas);
  $('spsDisplay').textContent = `${format(productionPerSecond())}/s`;
  $('spcDisplay').textContent = format(clickPower());
  $('blueFlamesDisplay').textContent = format(state.chamasAzuis);
  $('totalSoulsDisplay').textContent = format(state.totalSouls);
  $('totalClicksDisplay').textContent = format(state.totalClicks);
  $('totalProducersDisplay').textContent = totalProducers();
  $('totalUpgradesDisplay').textContent = state.upgrades.length;
  document.body.classList.toggle('blood-moon', Date.now() < state.bloodMoonUntil);
  $('eventBanner').hidden = Date.now() >= state.bloodMoonUntil;

  $('producerList').innerHTML = PRODUCER_DEFINITIONS.map(p => {
    const cost = currentCost(p);
    return `<article class="card ${state.almas >= cost ? 'affordable' : ''}"><h3>${p.name}</h3><p>Quantidade: ${state.producers[p.id]}<br>Produção base: ${format(p.production)}/s<br>Custo atual: ${format(cost)} Almas</p><button onclick="buyProducer('${p.id}')">Invocar</button></article>`;
  }).join('');

  $('upgradeList').innerHTML = UPGRADE_DEFINITIONS.map(u => {
    const unlocked = u.unlock(state), bought = hasUpgrade(u.id);
    const desc = u.type === 'click' ? `+${u.amount} Alma por clique` : u.type === 'global' ? `Produção total x${u.multiplier}` : `${PRODUCER_DEFINITIONS.find(p => p.id === u.producerId).name} x${u.multiplier}`;
    return `<article class="card ${!unlocked ? 'locked' : ''} ${state.almas >= u.cost ? 'affordable' : ''}"><h3>${u.name}</h3><p>${desc}<br>Custo: ${format(u.cost)} Almas</p><button ${!unlocked || bought ? 'disabled' : ''} onclick="buyUpgrade('${u.id}')">${bought ? 'Comprado' : unlocked ? 'Comprar' : 'Bloqueado'}</button></article>`;
  }).join('');
}

function showMessage(text) { $('messageBox').textContent = text; setTimeout(() => { $('messageBox').textContent = ''; }, 6000); }
function floatingText(text, x, y) { const el = document.createElement('div'); el.className = 'floating-text'; el.textContent = text; el.style.left = `${x}px`; el.style.top = `${y}px`; document.body.appendChild(el); setTimeout(() => el.remove(), 1000); }

$('ritualButton').addEventListener('click', e => { const amount = clickPower(); gainSouls(amount); state.totalClicks++; floatingText(`+${format(amount)} Alma`, e.clientX, e.clientY); $('ritualButton').classList.add('clicked'); setTimeout(() => $('ritualButton').classList.remove('clicked'), 280); saveGame(); render(); });
document.querySelectorAll('.tab-button').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('.tab-button,.tab-panel').forEach(el => el.classList.remove('active')); btn.classList.add('active'); $(btn.dataset.tab).classList.add('active'); }));
$('exportSave').addEventListener('click', () => { saveGame(); const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'imperio-de-monstros-save.json' }); a.click(); URL.revokeObjectURL(a.href); });
$('importSave').addEventListener('change', e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { state = { ...defaultState(), ...JSON.parse(reader.result) }; saveGame(); render(); showMessage('Save importado com sucesso.'); }; reader.readAsText(file); });
$('resetSave').addEventListener('click', () => { if (confirm('Tem certeza que deseja resetar seu império?')) { localStorage.removeItem(SAVE_KEY); state = defaultState(); saveGame(); render(); } });

function gameLoop(now) {
  const delta = (now - lastFrame) / 1000; lastFrame = now;
  gainSouls(productionPerSecond() * delta);
  bloodMoonCheck += delta;
  if (bloodMoonCheck >= BLOOD_MOON_CONFIG.checkEverySeconds) {
    bloodMoonCheck = 0;
    if (Date.now() > state.bloodMoonUntil && Math.random() < BLOOD_MOON_CONFIG.chance) {
      state.bloodMoonUntil = Date.now() + BLOOD_MOON_CONFIG.durationSeconds * 1000;
      showMessage('A Lua Sangrenta nasceu! Produção dobrada por 20 segundos.');
    }
  }
  render(); requestAnimationFrame(gameLoop);
}
setInterval(saveGame, 5000);
render(); requestAnimationFrame(gameLoop);
