import { PRODUCER_DEFINITIONS } from '../data/producers.js';
import { visualTierForQuantity } from './milestones.js';

export function updateProducerStageTiers(state) {
  const stage = document.getElementById('producerStage');
  const empireStage = document.getElementById('empireStage');
  if (!stage) return;

  for (const producer of PRODUCER_DEFINITIONS) {
    const quantity = state.producers[producer.id] || 0;
    const tier = visualTierForQuantity(quantity);
    if (empireStage) empireStage.dataset[`${producer.id}Tier`] = String(Math.max(tier, 0));
    const existing = stage.querySelector(`[data-producer-visual="${producer.id}"]`);

    if (tier < 0) {
      existing?.remove();
      continue;
    }

    const element = existing || document.createElement('div');
    if (!existing) {
      element.dataset.producerVisual = producer.id;
      element.className = `producer-visual pixel-sprite ${producer.visualClass}`;
      element.title = producer.name;
      element.innerHTML = '<i></i><b></b><em></em><span></span>';
      stage.appendChild(element);
    }
    element.dataset.tier = String(tier);
    element.classList.toggle('producer-tier-0', tier === 0);
    element.classList.toggle('producer-tier-1', tier === 1);
    element.classList.toggle('producer-tier-2', tier === 2);
    element.classList.toggle('producer-tier-3', tier === 3);
    element.classList.toggle('producer-tier-4', tier === 4);
    element.classList.toggle('producer-tier-5', tier === 5);
  }
}
