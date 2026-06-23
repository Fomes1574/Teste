import { PRODUCER_DEFINITIONS } from '../data/producers.js';
import { getProducerVisualTier } from './milestones.js';

const fallbackMarkup = {
  goblin: '<div class="sprite goblin-sprite"><span class="ear left"></span><span class="ear right"></span><span class="head"></span><span class="eye left"></span><span class="eye right"></span><span class="body"></span><span class="arm knife"></span><span class="arm sack"></span><span class="leg left"></span><span class="leg right"></span></div><div class="stage-prop goblin-banner"></div><div class="stage-prop goblin-camp"></div>',
  skeleton: '<div class="sprite skeleton-sprite"><span class="skull"></span><span class="ribcage"></span><span class="spine"></span><span class="arm spear"></span><span class="arm shield"></span><span class="leg left"></span><span class="leg right"></span></div><div class="stage-prop bone-wall"></div>',
  witch: '<div class="sprite witch-sprite"><span class="hat"></span><span class="face"></span><span class="cloak"></span><span class="staff"></span><span class="magic"></span></div><div class="stage-prop witch-circle"></div>',
  necromancer: '<div class="sprite necromancer-sprite"><span class="hood"></span><span class="mask"></span><span class="robe"></span><span class="staff"></span><span class="book"></span><span class="aura"></span></div><div class="stage-prop necromancer-books"></div>',
  default: '<div class="sprite monster-sprite"><span class="head"></span><span class="body"></span><span class="arm left"></span><span class="arm right"></span></div>'
};

export function updateProducerStageTiers(state) {
  const stage = document.getElementById('producerStage');
  const empireStage = document.getElementById('empireStage');
  if (!stage) return;

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
      element.innerHTML = fallbackMarkup[producer.id] || fallbackMarkup.default;
      stage.appendChild(element);
    }
    element.dataset.tier = String(tier);
    for (let i = 1; i <= 6; i += 1) element.classList.toggle(`producer-tier-${i}`, tier === i);
  }
}
