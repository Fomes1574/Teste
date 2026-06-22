import { PRODUCER_DEFINITIONS } from '../data/producers.js';
import { UPGRADE_DEFINITIONS } from '../data/upgrades.js';
import { clickPower, currentCost, productionPerSecond } from './economy.js';
import { isBloodMoonActive } from './events.js';
import { formatNumber } from '../utils/format.js';

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
  setTimeout(() => element.remove(), 1100);
}

function renderProducerStage(state) {
  $('producerStage').innerHTML = PRODUCER_DEFINITIONS
    .filter(producer => state.producers[producer.id] > 0)
    .map(producer => `<div class="producer-visual ${producer.visualClass}" title="${producer.name}"><i></i><b></b><em></em></div>`)
    .join('');
}

export function render(state) {
  $('soulsDisplay').textContent = formatNumber(state.almas);
  $('spsDisplay').textContent = `${formatNumber(productionPerSecond(state))}/s`;
  $('spcDisplay').textContent = formatNumber(clickPower(state));
  $('blueFlamesDisplay').textContent = formatNumber(state.chamasAzuis);
  $('totalSoulsDisplay').textContent = formatNumber(state.totalSouls);
  $('totalClicksDisplay').textContent = formatNumber(state.totalClicks);
  $('totalProducersDisplay').textContent = Object.values(state.producers).reduce((a, b) => a + b, 0);
  $('totalUpgradesDisplay').textContent = state.upgrades.length;
  document.body.classList.toggle('blood-moon-active', isBloodMoonActive(state));
  $('eventBanner').hidden = !isBloodMoonActive(state);

  $('producerList').innerHTML = PRODUCER_DEFINITIONS.map(producer => {
    const cost = currentCost(producer, state);
    const quantity = state.producers[producer.id];
    const canBuy = state.almas >= cost;
    return `<article class="game-card ${canBuy ? 'affordable' : ''}">
      <div class="card-top"><h3>${producer.name}</h3><span>${formatNumber(quantity)}</span></div>
      <p>${producer.flavor}</p>
      <dl><div><dt>Produção base</dt><dd>${formatNumber(producer.production)}/s</dd></div><div><dt>Custo atual</dt><dd>${formatNumber(cost)} Almas</dd></div></dl>
      <div class="card-actions"><button data-buy-producer="${producer.id}">Comprar</button><button data-buy-max="${producer.id}">Comprar máximo</button></div>
    </article>`;
  }).join('');

  const visibleUpgrades = UPGRADE_DEFINITIONS.filter(upgrade => upgrade.unlock(state) || state.upgrades.includes(upgrade.id));
  $('upgradeList').innerHTML = visibleUpgrades.length ? visibleUpgrades.map(upgrade => {
    const bought = state.upgrades.includes(upgrade.id);
    const canBuy = state.almas >= upgrade.cost && !bought;
    return `<article class="game-card ${canBuy ? 'affordable' : ''} ${bought ? 'owned' : ''}">
      <div class="card-top"><h3>${upgrade.name}</h3><span>${bought ? 'Obtido' : formatNumber(upgrade.cost)}</span></div>
      <p>${upgrade.description}</p>
      <button data-buy-upgrade="${upgrade.id}" ${bought ? 'disabled' : ''}>${bought ? 'Comprado' : 'Comprar upgrade'}</button>
    </article>`;
  }).join('') : '<p class="empty-state">Colete mais Almas ou compre produtores para revelar upgrades.</p>';

  renderProducerStage(state);
}
