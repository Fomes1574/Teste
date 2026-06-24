import { PRODUCER_DEFINITIONS } from '../data/producers.js';
import { getProducerVisualTier } from './milestones.js';
import { hasSprite, producerSpriteKeys } from './sprites.js';

const fallbackMarkup = {
  goblin: '<div class="sprite goblin-sprite"><span class="ear left"></span><span class="ear right"></span><span class="head"></span><span class="eye left"></span><span class="eye right"></span><span class="body"></span><span class="arm knife"></span><span class="arm sack"></span><span class="leg left"></span><span class="leg right"></span></div><div class="stage-prop goblin-banner"></div><div class="stage-prop goblin-camp"></div>',
  skeleton: '<div class="sprite skeleton-sprite"><span class="skull"></span><span class="ribcage"></span><span class="spine"></span><span class="arm spear"></span><span class="arm shield"></span><span class="leg left"></span><span class="leg right"></span></div><div class="stage-prop bone-wall"></div>',
  witch: '<div class="sprite witch-sprite"><span class="hat"></span><span class="face"></span><span class="cloak"></span><span class="staff"></span><span class="magic"></span></div><div class="stage-prop witch-circle"></div>',
  necromancer: '<div class="sprite necromancer-sprite"><span class="hood"></span><span class="mask"></span><span class="robe"></span><span class="staff"></span><span class="book"></span><span class="aura"></span></div><div class="stage-prop necromancer-books"></div>',
  default: '<div class="sprite monster-sprite"><span class="head"></span><span class="body"></span><span class="arm left"></span><span class="arm right"></span></div>'
};

function shouldUseSprite(producerId) {
  const keys = producerSpriteKeys(producerId);
  return keys ? hasSprite(keys.idle) : false;
}

function applyRenderer(element, producer) {
  const spriteEnabled = shouldUseSprite(producer.id);
  const renderer = spriteEnabled ? 'sprite-sheet' : 'fallback';
  if (element.dataset.renderer === renderer) return;
  element.dataset.renderer = renderer;
  if (spriteEnabled) {
    element.innerHTML = '<div class="sprite-viewport"><div class="sprite-sheet-layer" aria-hidden="true"></div></div>';
    element.classList.remove(producer.visualClass, 'pixel-sprite');
    element.classList.add('sprite-unit', `sprite-${producer.id}`);
    return;
  }
  element.innerHTML = fallbackMarkup[producer.id] || fallbackMarkup.default;
  element.classList.remove('sprite-unit', `sprite-${producer.id}`);
  element.classList.add('pixel-sprite', producer.visualClass);
}

function visualPriority(state, producer) {
  const quantity = state.producers[producer.id] || 0;
  if (quantity <= 0) return -1;
  return quantity * producer.production;
}

const SPECIAL_STAGE_SLOTS = {
  gargoyle: 'prop-left',
  dragon: 'sky-dragon-slot',
  portal: 'background-portal-slot',
  lich: 'background-lich-slot',
  god: 'background-god-slot'
};

const SUPPORT_PRODUCERS = new Set(['witch', 'necromancer']);
const FRONT_STAGE_SLOTS = ['monster-front-left', 'monster-front-center'];
const SUPPORT_STAGE_SLOTS = ['monster-support-left', 'monster-support-back'];

export function updateProducerStageTiers(state) {
  const stage = document.getElementById('producerStage');
  const empireStage = document.getElementById('empireStage');
  if (!stage) return;

  const frontProducerIds = PRODUCER_DEFINITIONS
    .filter(producer => (state.producers[producer.id] || 0) > 0)
    .filter(producer => !SUPPORT_PRODUCERS.has(producer.id) && !SPECIAL_STAGE_SLOTS[producer.id])
    .sort((a, b) => visualPriority(state, b) - visualPriority(state, a))
    .slice(0, FRONT_STAGE_SLOTS.length)
    .map(producer => producer.id);

  const supportProducerIds = PRODUCER_DEFINITIONS
    .filter(producer => (state.producers[producer.id] || 0) > 0)
    .filter(producer => SUPPORT_PRODUCERS.has(producer.id) || (!frontProducerIds.includes(producer.id) && !SPECIAL_STAGE_SLOTS[producer.id]))
    .sort((a, b) => visualPriority(state, b) - visualPriority(state, a))
    .slice(0, SUPPORT_STAGE_SLOTS.length)
    .map(producer => producer.id);

  for (const producer of PRODUCER_DEFINITIONS) {
    const quantity = state.producers[producer.id] || 0;
    const tier = getProducerVisualTier(producer.id, quantity);
    if (empireStage) empireStage.dataset[`${producer.id}Tier`] = String(tier);
    const existing = stage.querySelector(`[data-producer-visual="${producer.id}"]`);

    if (tier === 0) {
      existing?.remove();
      continue;
    }

    const element = existing || document.createElement('div');
    if (!existing) {
      element.dataset.producerVisual = producer.id;
      element.dataset.state = 'idle';
      element.className = `stage-unit producer-visual pixel-sprite ${producer.id} ${producer.visualClass}`;
      element.title = producer.name;
      stage.appendChild(element);
    }
    applyRenderer(element, producer);
    element.dataset.tier = String(tier);
    const frontSlotIndex = frontProducerIds.indexOf(producer.id);
    const supportSlotIndex = supportProducerIds.indexOf(producer.id);
    const slot = SPECIAL_STAGE_SLOTS[producer.id]
      || (frontSlotIndex >= 0 ? FRONT_STAGE_SLOTS[frontSlotIndex] : null)
      || (supportSlotIndex >= 0 ? SUPPORT_STAGE_SLOTS[supportSlotIndex] : 'prop-right');
    element.dataset.slot = slot;
    element.classList.toggle('is-featured-unit', frontSlotIndex >= 0);
    element.classList.toggle('is-support-unit', supportSlotIndex >= 0);
    element.classList.toggle('is-background-unit', Boolean(SPECIAL_STAGE_SLOTS[producer.id]));
    for (let i = 1; i <= 6; i += 1) element.classList.toggle(`producer-tier-${i}`, tier === i);
  }
}
