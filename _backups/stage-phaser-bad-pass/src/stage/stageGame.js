import { STAGE_BASE_HEIGHT, STAGE_BASE_WIDTH } from './stageConfig.js';
import { toStageVisualState } from './stageBridge.js';

let stageGame = null;
let stageScene = null;
let stageGetState = null;
let stageHost = null;
let stageInitPromise = null;

function warnStageError(message, error) {
  console.warn(`[Palco Phaser] ${message}`, error);
}

function getScene() {
  if (stageScene) return stageScene;
  if (!stageGame) return null;
  try {
    stageScene = stageGame.scene.getScene('StageScene');
    return stageScene;
  } catch (error) {
    warnStageError('Cena indisponivel.', error);
    return null;
  }
}

function applyEnabledClass(enabled) {
  try {
    document.body.classList.toggle('phaser-stage-enabled', enabled);
    document.getElementById('empireStage')?.classList.toggle('phaser-stage-enabled', enabled);
  } catch (error) {
    warnStageError('Nao foi possivel alternar classe visual.', error);
  }
}

export async function initStageGame(options = {}) {
  try {
    if (stageGame) return stageGame;
    if (stageInitPromise) return stageInitPromise;
    const { containerId, getState } = options;
    stageHost = document.getElementById(containerId);
    if (!stageHost) return null;
    stageGetState = typeof getState === 'function' ? getState : null;
    stageInitPromise = Promise.all([
      import('phaser'),
      import('./StageScene.js')
    ]).then(([phaserModule, sceneModule]) => {
      const Phaser = phaserModule.default || phaserModule;
      const StageScene = sceneModule.createStageScene(Phaser);

      stageGame = new Phaser.Game({
        type: Phaser.AUTO,
        parent: stageHost,
        width: STAGE_BASE_WIDTH,
        height: STAGE_BASE_HEIGHT,
        backgroundColor: '#09050a',
        scene: StageScene,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: STAGE_BASE_WIDTH,
          height: STAGE_BASE_HEIGHT
        },
        render: {
          antialias: false,
          pixelArt: true
        },
        audio: {
          noAudio: true
        }
      });

      applyEnabledClass(true);
      if (stageGetState) syncStageState(stageGetState());
      return stageGame;
    }).catch(error => {
      warnStageError('Falha ao carregar Phaser. O palco DOM antigo continua ativo.', error);
      applyEnabledClass(false);
      stageInitPromise = null;
      return null;
    });
    return stageInitPromise;
  } catch (error) {
    warnStageError('Falha ao iniciar. O palco DOM antigo continua ativo.', error);
    applyEnabledClass(false);
    stageInitPromise = null;
    return null;
  }
}

export function syncStageState(state) {
  try {
    const scene = getScene();
    if (!scene || typeof scene.syncVisualState !== 'function') return;
    scene.syncVisualState(toStageVisualState(state || stageGetState?.()));
  } catch (error) {
    warnStageError('Falha ao sincronizar state visual.', error);
  }
}

export function emitRitualClick(payload = {}) {
  try {
    const scene = getScene();
    if (!scene || typeof scene.handleRitualClick !== 'function') return;
    scene.handleRitualClick(payload);
  } catch (error) {
    warnStageError('Falha ao emitir clique ritual.', error);
  }
}

export function emitPurchase(payload = {}) {
  try {
    const scene = getScene();
    if (!scene || typeof scene.handlePurchase !== 'function') return;
    scene.handlePurchase(payload);
  } catch (error) {
    warnStageError('Falha ao emitir compra.', error);
  }
}

export function destroyStageGame() {
  try {
    if (stageGame) stageGame.destroy(true);
  } catch (error) {
    warnStageError('Falha ao destruir instancia Phaser.', error);
  } finally {
    stageGame = null;
    stageScene = null;
    stageGetState = null;
    stageHost = null;
    stageInitPromise = null;
    applyEnabledClass(false);
  }
}
