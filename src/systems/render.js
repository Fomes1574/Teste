import { PRODUCER_DEFINITIONS } from '../data/producers.js';
import { UPGRADE_DEFINITIONS } from '../data/upgrades.js';
import { clickPower, currentCost, productionPerSecond } from './economy.js';
import { isBloodMoonActive } from './events.js';
import { formatNumber } from '../utils/format.js';
import { MILESTONE_UPGRADE_DEFINITIONS } from '../data/milestoneUpgrades.js';
import { nextMilestoneForProducer } from './milestones.js';
import { updateProducerStageTiers } from './progressionVisuals.js';

const $ = id => document.getElementById(id);

export function showMessage(text) {
  $('messageBox').textContent = text;
}

export function spawnFloatingText(text, x, y) {
  const element = document.createElement('div');
  element.className = 'floating-text';
  element.textContent = text;
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
  document.body.appendChild(element);
  setTimeout(() => element.remove(), 900);
}

export function renderProducerStage(state) {
  updateProducerStageTiers(state);
}

function worldStage(state) {
  if (state.totalSouls >= 1000000 || state.producers.god > 0 || state.producers.lich > 0) return 'stage-high';
  if (state.totalSouls >= 25000 || state.producers.portal > 0 || state.producers.dragon > 0) return 'stage-greater';
  if (state.totalSouls >= 1000 || Object.values(state.producers).reduce((a, b) => a + b, 0) >= 15) return 'stage-mid';
  return 'stage-start';
}

function updateMilestone(state) {
  const nextProducer = PRODUCER_DEFINITIONS.find(producer => state.almas < currentCost(producer, state) && state.producers[producer.id] === 0)
    || PRODUCER_DEFINITIONS.find(producer => state.almas < currentCost(producer, state));
  const milestoneTargets = MILESTONE_UPGRADE_DEFINITIONS
    .filter(upgrade => !state.milestoneUpgrades.includes(upgrade.id))
    .sort((a, b) => (a.milestone - (state.producers[a.producerId] || 0)) - (b.milestone - (state.producers[b.producerId] || 0)));
  const nextMilestone = milestoneTargets[0];
  if (nextMilestone) {
    const owned = state.producers[nextMilestone.producerId] || 0;
    const producerName = PRODUCER_DEFINITIONS.find(producer => producer.id === nextMilestone.producerId)?.name || 'produtor';
    $('nextMilestoneTitle').textContent = nextMilestone.name;
    $('nextMilestoneText').textContent = nextMilestone.unlock(state)
      ? `Marco desbloqueado para ${producerName}. Custo: ${formatNumber(nextMilestone.cost)} Almas.`
      : `Compre mais ${nextMilestone.milestone - owned} ${producerName} para desbloquear.`;
    return;
  }
  const nextUpgrade = UPGRADE_DEFINITIONS.find(upgrade => upgrade.unlock(state) && !state.upgrades.includes(upgrade.id) && state.almas < upgrade.cost);
  if (nextUpgrade && (!nextProducer || nextUpgrade.cost < currentCost(nextProducer, state))) {
    $('nextMilestoneTitle').textContent = nextUpgrade.name;
    $('nextMilestoneText').textContent = `Junte ${formatNumber(nextUpgrade.cost)} Almas para comprar este upgrade.`;
    return;
  }
  if (nextProducer) {
    $('nextMilestoneTitle').textContent = nextProducer.name;
    $('nextMilestoneText').textContent = `Junte ${formatNumber(currentCost(nextProducer, state))} Almas para invocar.`;
    return;
  }
  $('nextMilestoneTitle').textContent = 'Domínio Monstruoso';
  $('nextMilestoneText').textContent = 'Continue ampliando produtores e upgrades.';
}

export function updateResourceDisplays(state) {
  $('soulsDisplay').textContent = formatNumber(state.almas);
  $('spsDisplay').textContent = `${formatNumber(productionPerSecond(state))}/s`;
  $('spcDisplay').textContent = formatNumber(clickPower(state));
  $('blueFlamesDisplay').textContent = formatNumber(state.chamasAzuis);
}

export function updateWorldVisuals(state) {
  document.body.classList.toggle('blood-moon-active', isBloodMoonActive(state));
  document.body.dataset.worldStage = worldStage(state);
  $('eventBanner').hidden = !isBloodMoonActive(state);
  updateMilestone(state);
}

export function renderProducerList(state) {
  $('producerList').innerHTML = PRODUCER_DEFINITIONS.map(producer => {
    const cost = currentCost(producer, state);
    const quantity = state.producers[producer.id];
    const canBuy = state.almas >= cost;
    const nextMilestone = nextMilestoneForProducer(state, producer.id);
    const milestoneText = nextMilestone
      ? nextMilestone.unlock(state)
        ? `Desbloqueado: ${nextMilestone.name} · ${formatNumber(nextMilestone.cost)} Almas`
        : `Próximo marco: ${nextMilestone.name} em ${nextMilestone.milestone - quantity} compra(s)`
      : 'Todos os marcos atuais foram conquistados.';
    return `<article class="game-card ${canBuy ? 'affordable' : ''}" data-producer-card="${producer.id}">
      <div class="card-top"><h3>${producer.name}</h3><span>${formatNumber(quantity)}</span></div>
      <p>${producer.flavor}</p>
      <dl><div><dt>Produção base</dt><dd>${formatNumber(producer.production)}/s</dd></div><div><dt>Custo atual</dt><dd>${formatNumber(cost)} Almas</dd></div></dl>
      <p class="next-producer-milestone">${milestoneText}</p>
      <div class="card-actions"><button type="button" data-buy-producer="${producer.id}" data-buy-amount="1">Comprar 1</button><button type="button" data-buy-producer="${producer.id}" data-buy-amount="10">Comprar 10</button><button type="button" data-buy-producer="${producer.id}" data-buy-amount="100">Comprar 100</button><button type="button" data-buy-max="${producer.id}">Máximo</button></div>
    </article>`;
  }).join('');
}

export function upgradeVisibilitySignature(state) {
  const regular = UPGRADE_DEFINITIONS
    .filter(upgrade => upgrade.unlock(state) || state.upgrades.includes(upgrade.id))
    .map(upgrade => `${upgrade.id}:${state.upgrades.includes(upgrade.id) ? '1' : '0'}`);
  const milestones = MILESTONE_UPGRADE_DEFINITIONS
    .filter(upgrade => upgrade.unlock(state) || state.milestoneUpgrades.includes(upgrade.id))
    .map(upgrade => `${upgrade.id}:${state.milestoneUpgrades.includes(upgrade.id) ? '1' : '0'}`);
  return [...regular, ...milestones].join('|');
}

export function renderMilestoneUpgrades(state) {
  const milestoneUpgrades = MILESTONE_UPGRADE_DEFINITIONS.filter(upgrade => upgrade.unlock(state) || state.milestoneUpgrades.includes(upgrade.id));
  return milestoneUpgrades.length ? milestoneUpgrades.map(upgrade => {
    const bought = state.milestoneUpgrades.includes(upgrade.id);
    const canBuy = state.almas >= upgrade.cost && !bought;
    return `<article class="game-card milestone-upgrade-card ${canBuy ? 'affordable' : ''} ${bought ? 'owned' : ''}">
      <div class="card-top"><h3>${upgrade.name}</h3><span>${bought ? 'Obtido' : formatNumber(upgrade.cost)}</span></div>
      <p>${upgrade.description}</p>
      <button type="button" data-buy-milestone-upgrade="${upgrade.id}" ${bought ? 'disabled' : ''}>${bought ? 'Comprado' : 'Comprar marco'}</button>
    </article>`;
  }).join('') : '<p class="empty-state">Compre monstros até 25/50/75/100+ para revelar Upgrades de Marco.</p>';
}

export function renderUpgradeList(state) {
  const visibleUpgrades = UPGRADE_DEFINITIONS.filter(upgrade => upgrade.unlock(state) || state.upgrades.includes(upgrade.id));
  const regularHtml = visibleUpgrades.length ? visibleUpgrades.map(upgrade => {
    const bought = state.upgrades.includes(upgrade.id);
    const canBuy = state.almas >= upgrade.cost && !bought;
    return `<article class="game-card ${canBuy ? 'affordable' : ''} ${bought ? 'owned' : ''}">
      <div class="card-top"><h3>${upgrade.name}</h3><span>${bought ? 'Obtido' : formatNumber(upgrade.cost)}</span></div>
      <p>${upgrade.description}</p>
      <button type="button" data-buy-upgrade="${upgrade.id}" ${bought ? 'disabled' : ''}>${bought ? 'Comprado' : 'Comprar upgrade'}</button>
    </article>`;
  }).join('') : '<p class="empty-state">Colete mais Almas ou compre produtores para revelar upgrades.</p>';
  $('upgradeList').innerHTML = `<h3 class="upgrade-section-title">Upgrades</h3>${regularHtml}<h3 class="upgrade-section-title">Upgrades de Marco</h3>${renderMilestoneUpgrades(state)}`;
}


export function updateStatistics(state) {
  $('totalSoulsDisplay').textContent = formatNumber(state.totalSouls);
  $('totalClicksDisplay').textContent = formatNumber(state.totalClicks);
  $('totalProducersDisplay').textContent = Object.values(state.producers).reduce((a, b) => a + b, 0);
  $('totalUpgradesDisplay').textContent = state.upgrades.length + state.milestoneUpgrades.length;
}

export function render(state) {
  updateResourceDisplays(state);
  updateStatistics(state);
  updateWorldVisuals(state);
  renderProducerList(state);
  renderUpgradeList(state);
  renderProducerStage(state);
}
