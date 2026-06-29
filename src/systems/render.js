import { PRODUCER_DEFINITIONS } from '../data/producers.js';
import { UPGRADE_DEFINITIONS } from '../data/upgrades.js';
import { clickPower, currentCost, producerBulkCost, producerProductionBreakdown, productionPerSecond } from './economy.js';
import { isBloodMoonActive } from './events.js';
import { formatNumber } from '../utils/format.js';
import { MILESTONE_UPGRADE_DEFINITIONS } from '../data/milestoneUpgrades.js';
import { nextMilestoneForProducer } from './milestones.js';
import { updateProducerStageTiers } from './progressionVisuals.js';

const $ = id => document.getElementById(id);
let lastHordeSummarySignature = '';
let lastMainHordeDockSignature = '';

function buttonPriceMarkup(label, cost) {
  return `<span class="button-label">${label}</span><span class="button-cost">${formatNumber(cost)} Almas</span>`;
}

function productionShare(totalProduction, producerProduction) {
  return totalProduction > 0 ? (producerProduction / totalProduction) * 100 : 0;
}

function hordeTotals(state) {
  const breakdown = producerProductionBreakdown(state);
  const totalMonsters = breakdown.reduce((total, producer) => total + producer.quantity, 0);
  const totalProduction = breakdown.reduce((total, producer) => total + producer.totalProduction, 0);
  const topProducer = breakdown.reduce((top, producer) => producer.totalProduction > top.totalProduction ? producer : top, { name: 'Nenhum', totalProduction: 0 });
  return { breakdown, totalMonsters, totalProduction, topProducer };
}

function hordeSignature(breakdown, totalMonsters, totalProduction, topProducer, prefix = '') {
  const producerSignature = breakdown
    .map(producer => `${producer.id}:${producer.quantity}:${producer.totalProduction.toFixed(3)}`)
    .join('|');
  return `${prefix}${totalMonsters}:${totalProduction.toFixed(3)}:${topProducer.name}:${producerSignature}`;
}

export function renderHordeSummary(state) {
  const target = $('hordeSummary');
  if (!target) return;
  const { breakdown, totalMonsters, totalProduction, topProducer } = hordeTotals(state);
  const activeTypes = breakdown.filter(producer => producer.quantity > 0).length;
  const signature = hordeSignature(breakdown, totalMonsters, totalProduction, topProducer, 'compact:');
  if (signature === lastHordeSummarySignature) return;
  lastHordeSummarySignature = signature;

  target.innerHTML = `<div class="horde-compact-stat"><span>Total</span><strong>${formatNumber(totalMonsters)}</strong></div>
    <div class="horde-compact-stat"><span>Tipos ativos</span><strong>${formatNumber(activeTypes)}</strong></div>
    <div class="horde-compact-stat"><span>Produção</span><strong>${formatNumber(totalProduction)}/s</strong></div>
    <div class="horde-compact-stat"><span>Maior</span><strong>${topProducer.totalProduction > 0 ? topProducer.name : 'Nenhum'}</strong></div>`;
}

function relevantDockProducers(state, breakdown) {
  const byId = new Map(breakdown.map(item => [item.id, item]));
  return PRODUCER_DEFINITIONS
    .map((producer, index) => {
      const quantity = state.producers[producer.id] || 0;
      const nextCost = currentCost(producer, state);
      const breakdownItem = byId.get(producer.id);
      const ownedScore = quantity > 0 ? 100000 : 0;
      const affordableScore = state.almas >= nextCost ? 10000 : 0;
      const proximityScore = quantity === 0 && state.almas < nextCost ? Math.max(0, 1000 - (nextCost - state.almas) / Math.max(1, nextCost) * 1000) : 0;
      const productionScore = breakdownItem?.totalProduction || 0;
      return { producer, index, quantity, nextCost, score: ownedScore + affordableScore + proximityScore + productionScore };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 6);
}

export function renderMainHordeDock(state) {
  const target = $('mainHordeDock');
  if (!target) return;
  const { breakdown, totalMonsters, totalProduction, topProducer } = hordeTotals(state);
  const selected = relevantDockProducers(state, breakdown);
  const best = selected[0];
  const signature = `${hordeSignature(breakdown, totalMonsters, totalProduction, topProducer, 'dock-compact:')}|${best ? `${best.producer.id}:${best.nextCost.toFixed(2)}:${state.almas >= best.nextCost ? '1' : '0'}` : 'none'}`;
  if (signature === lastMainHordeDockSignature) return;
  lastMainHordeDockSignature = signature;
  const actions = best ? [
    `<button type="button" data-buy-producer="${best.producer.id}" data-buy-amount="1"><span class="button-label">Comprar x1 ${best.producer.name}</span><span class="button-cost">${formatNumber(producerBulkCost(best.producer, state, 1))} Almas</span></button>`,
    `<button type="button" data-buy-producer="${best.producer.id}" data-buy-amount="10"><span class="button-label">Comprar x10 ${best.producer.name}</span><span class="button-cost">${formatNumber(producerBulkCost(best.producer, state, 10))} Almas</span></button>`
  ].join('') : '';

  target.innerHTML = `<div class="dock-header"><div><span>Resumo da Horda</span><strong>${formatNumber(totalMonsters)} monstros · ${formatNumber(totalProduction)}/s</strong></div><em>Maior: ${topProducer.totalProduction > 0 ? topProducer.name : 'Nenhum'}</em></div><div class="dock-actions compact-dock-actions">${actions}<button type="button" data-open-tab="monsters"><span class="button-label">Abrir Loja</span></button></div>`;
}

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

function worldCorruption(state) {
  const combatants = (state.producers.goblin || 0) + (state.producers.skeleton || 0);
  if (state.totalSouls >= 25000 || combatants >= 25) return '2';
  if (state.totalSouls >= 1000 || combatants >= 8) return '1';
  return '0';
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
  renderHordeSummary(state);
  renderMainHordeDock(state);
}

export function updateWorldVisuals(state) {
  document.body.classList.toggle('blood-moon-active', isBloodMoonActive(state));
  document.body.dataset.worldStage = worldStage(state);
  document.body.dataset.worldCorruption = worldCorruption(state);
  $('eventBanner').hidden = !isBloodMoonActive(state);
  updateMilestone(state);
}

export function renderProducerList(state) {
  const productionById = new Map(producerProductionBreakdown(state).map(item => [item.id, item]));
  $('producerList').innerHTML = PRODUCER_DEFINITIONS.map(producer => {
    const cost = currentCost(producer, state);
    const cost1 = producerBulkCost(producer, state, 1);
    const cost10 = producerBulkCost(producer, state, 10);
    const cost100 = producerBulkCost(producer, state, 100);
    const production = productionById.get(producer.id);
    const quantity = state.producers[producer.id];
    const canBuy = state.almas >= cost1;
    const nextMilestone = nextMilestoneForProducer(state, producer.id);
    const milestoneText = nextMilestone
      ? nextMilestone.unlock(state)
        ? `Desbloqueado: ${nextMilestone.name} · ${formatNumber(nextMilestone.cost)} Almas`
        : `Próximo marco: ${nextMilestone.name} em ${nextMilestone.milestone - quantity} compra(s)`
      : 'Todos os marcos atuais foram conquistados.';
    return `<article class="game-card ${canBuy ? 'affordable' : ''}" data-producer-card="${producer.id}">
      <div class="card-top"><h3>${producer.name}</h3><span>${formatNumber(quantity)}</span></div>
      <p>${producer.flavor}</p>
      <dl><div><dt>Produção base</dt><dd>${formatNumber(producer.production)}/s</dd></div><div><dt>Produção atual</dt><dd>${formatNumber(quantity > 0 ? (production?.totalProduction || 0) / quantity : producer.production * (production?.producerMultiplier || 1) * (production?.globalMultiplier || 1) * (production?.bloodMoonMultiplier || 1))}/s cada</dd></div><div><dt>Total atual</dt><dd>${formatNumber(production?.totalProduction || 0)}/s</dd></div><div><dt>Custo atual</dt><dd>${formatNumber(cost)} Almas</dd></div></dl>
      <p class="next-producer-milestone">${milestoneText}</p>
      <div class="card-actions"><button type="button" data-buy-producer="${producer.id}" data-buy-amount="1">${buttonPriceMarkup('Comprar x1', cost1)}</button><button type="button" data-buy-producer="${producer.id}" data-buy-amount="10">${buttonPriceMarkup('Comprar x10', cost10)}</button><button type="button" data-buy-producer="${producer.id}" data-buy-amount="100">${buttonPriceMarkup('Comprar x100', cost100)}</button><button type="button" data-buy-max="${producer.id}">Máximo</button></div>
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
      <button type="button" data-buy-milestone-upgrade="${upgrade.id}" ${bought ? 'disabled' : ''}>${bought ? 'Comprado' : buttonPriceMarkup('Comprar marco', upgrade.cost)}</button>
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
      <button type="button" data-buy-upgrade="${upgrade.id}" ${bought ? 'disabled' : ''}>${bought ? 'Comprado' : buttonPriceMarkup('Comprar upgrade', upgrade.cost)}</button>
    </article>`;
  }).join('') : '<p class="empty-state">Colete mais Almas ou compre produtores para revelar upgrades.</p>';
  $('upgradeList').innerHTML = `<h3 class="upgrade-section-title">Upgrades</h3>${regularHtml}<h3 class="upgrade-section-title">Upgrades de Marco</h3>${renderMilestoneUpgrades(state)}`;
}


export function updateStatistics(state) {
  $('totalSoulsDisplay').textContent = formatNumber(state.totalSouls);
  $('totalClicksDisplay').textContent = formatNumber(state.totalClicks);
  $('totalProducersDisplay').textContent = Object.values(state.producers).reduce((a, b) => a + b, 0);
  $('totalUpgradesDisplay').textContent = state.upgrades.length + state.milestoneUpgrades.length;
  renderDetailedStatistics(state);
}

function renderDetailedStatistics(state) {
  const ritualTarget = $('ritualStats');
  const hordeTarget = $('hordeProductionStats');
  const achievementTarget = $('visualAchievementStats');
  if (!ritualTarget || !hordeTarget || !achievementTarget) return;

  const stats = state.stats || {};
  const clickSouls = Number(stats.soulsFromClicks || 0);
  const productionSouls = Number(stats.soulsFromProduction || 0);
  const totalTracked = clickSouls + productionSouls;
  const clickShare = totalTracked > 0 ? (clickSouls / totalTracked) * 100 : 0;
  ritualTarget.innerHTML = `<h3>Cliques do Ritual</h3><div class="statistics-detail-grid">
    <article><span>Cliques reais</span><strong>${formatNumber(stats.ritualClicks || state.totalClicks || 0)}</strong></article>
    <article><span>Almas por clique</span><strong>${formatNumber(clickSouls)}</strong></article>
    <article><span>Almas por produção</span><strong>${formatNumber(productionSouls)}</strong></article>
    <article><span>Participação dos cliques</span><strong>${formatNumber(clickShare)}%</strong></article>
  </div>`;

  const breakdown = producerProductionBreakdown(state);
  const totalProduction = breakdown.reduce((total, producer) => total + producer.totalProduction, 0);
  const rows = breakdown.map(producer => {
    const share = productionShare(totalProduction, producer.totalProduction);
    return `<div class="production-row">
      <div class="production-row-main"><strong>${producer.name}</strong><span>${formatNumber(producer.quantity)} un.</span></div>
      <div class="production-row-output"><span>${formatNumber(producer.totalProduction)}/s</span><span>${formatNumber(share)}%</span></div>
      <div class="production-bar"><span style="--production-share:${share}%"></span></div>
    </div>`;
  }).join('');
  hordeTarget.innerHTML = `<h3>Produção da Horda</h3><div class="production-breakdown">${rows}</div>`;

  achievementTarget.innerHTML = `<h3>Conquistas Visuais</h3><div class="visual-achievement-grid">
    <span>Unidos pela Guerra</span><span>O Selo Desperta</span><span>Mãos Manchadas</span>
    <span>Primeira Queda</span><span>Legião</span><span>Céu Tomado</span>
  </div>`;
}

export function render(state) {
  updateResourceDisplays(state);
  updateStatistics(state);
  updateWorldVisuals(state);
  renderHordeSummary(state);
  renderMainHordeDock(state);
  renderProducerList(state);
  renderUpgradeList(state);
  renderProducerStage(state);
}
