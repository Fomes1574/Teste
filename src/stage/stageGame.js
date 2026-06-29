import { STAGE_BASE_HEIGHT, STAGE_BASE_WIDTH, STAGE_DEBUG, STAGE_DEBUG_BACKGROUND } from './stageConfig.js';
import { toStageVisualState } from './stageBridge.js';

let stageGame = null;
let stageScene = null;
let stageGetState = null;
let stageHost = null;
let stageInitPromise = null;
let stageReady = false;
let stageFirstRender = false;
let stageWatchdogId = null;
let stageValidationId = null;

function debugStage(message, details) {
  if (!STAGE_DEBUG) return;
  if (details === undefined) console.info(`[Palco Phaser][debug] ${message}`);
  else console.info(`[Palco Phaser][debug] ${message}`, details);
}

function warnStageError(message, error) {
  console.warn(`[Palco Phaser] ${message}`, error);
}

function hostRect() {
  const rect = stageHost?.getBoundingClientRect?.();
  return {
    width: Math.max(0, Math.round(rect?.width || 0)),
    height: Math.max(0, Math.round(rect?.height || 0)),
    left: Math.round(rect?.left || 0),
    top: Math.round(rect?.top || 0)
  };
}

function canvasInfo(canvas) {
  if (!canvas) return null;
  return {
    width: canvas.width,
    height: canvas.height,
    cssWidth: canvas.clientWidth,
    cssHeight: canvas.clientHeight,
    parentId: canvas.parentElement?.id || '',
    parentTag: canvas.parentElement?.tagName || ''
  };
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

function validateStageCanvas() {
  try {
    const canvas = stageHost?.querySelector('canvas') || stageGame?.canvas || stageGame?.renderer?.canvas;
    if (!canvas) return { valid: false, reason: 'canvas ausente' };
    if (stageHost && canvas.parentElement !== stageHost) stageHost.appendChild(canvas);
    if ((canvas.width < 8 || canvas.height < 8) && (canvas.clientWidth < 8 || canvas.clientHeight < 8)) {
      return { valid: false, reason: `canvas sem dimensao (${canvas.width}x${canvas.height}, css ${canvas.clientWidth}x${canvas.clientHeight})` };
    }
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return { valid: false, reason: 'contexto 2d indisponivel em modo Canvas' };
    const probes = [
      [0.08, 0.08],
      [0.5, 0.5],
      [0.92, 0.5],
      [0.02, 0.02],
      [0.98, 0.98]
    ];
    let darkOpaqueSamples = 0;
    let coloredSamples = 0;
    for (const [xRatio, yRatio] of probes) {
      const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(canvas.width * xRatio)));
      const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(canvas.height * yRatio)));
      const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
      const brightness = (red + green + blue) / 3;
      if (alpha > 220 && brightness < 4) darkOpaqueSamples += 1;
      if (alpha > 220 && (red > 24 || green > 48 || blue > 64)) coloredSamples += 1;
    }
    if (STAGE_DEBUG && coloredSamples < 2) {
      return { valid: false, reason: `cena debug sem cores suficientes (${coloredSamples}/5)`, canvas: canvasInfo(canvas) };
    }
    return {
      valid: darkOpaqueSamples < 2,
      reason: darkOpaqueSamples < 2 ? `canvas seguro (${coloredSamples}/5 amostras coloridas)` : 'canvas preto opaco',
      canvas: canvasInfo(canvas)
    };
  } catch (error) {
    warnStageError('Nao foi possivel validar o canvas.', error);
    return { valid: false, reason: 'validacao indisponivel' };
  }
}

function failStageFallback(message, error) {
  debugStage('fallback triggered', { message, error });
  if (message) warnStageError(message, error);
  try {
    if (stageGame) stageGame.destroy(true);
  } catch (destroyError) {
    warnStageError('Falha ao destruir Phaser apos erro.', destroyError);
  } finally {
    stageGame = null;
    stageScene = null;
    stageReady = false;
    stageFirstRender = false;
    stageInitPromise = null;
    if (stageWatchdogId) clearTimeout(stageWatchdogId);
    if (stageValidationId) clearTimeout(stageValidationId);
    stageWatchdogId = null;
    stageValidationId = null;
    applyEnabledClass(false);
  }
}

function validateOrRetry(attempt = 1) {
  const validation = validateStageCanvas();
  debugStage('Phaser canvas validation', { attempt, ...validation });
  if (validation.valid) {
    applyEnabledClass(true);
    if (stageWatchdogId) clearTimeout(stageWatchdogId);
    stageWatchdogId = null;
    stageValidationId = null;
    return;
  }
  if (attempt < 3) {
    stageValidationId = setTimeout(() => validateOrRetry(attempt + 1), 260);
    return;
  }
  failStageFallback(`Canvas Phaser indisponivel (${validation.reason}). Mantendo palco DOM antigo.`);
}

export async function initStageGame(options = {}) {
  try {
    if (stageGame) return stageGame;
    if (stageInitPromise) return stageInitPromise;
    const { containerId, getState } = options;
    stageHost = document.getElementById(containerId);
    if (!stageHost) return null;
    stageGetState = typeof getState === 'function' ? getState : null;
    const initialHostRect = hostRect();
    const gameWidth = initialHostRect.width > 0 ? initialHostRect.width : STAGE_BASE_WIDTH;
    const gameHeight = initialHostRect.height > 0 ? initialHostRect.height : STAGE_BASE_HEIGHT;
    debugStage('Phaser init started', { containerId, parent: initialHostRect });
    stageInitPromise = Promise.all([
      import('phaser'),
      import('./StageScene.js')
    ]).then(([phaserModule, sceneModule]) => {
      const Phaser = phaserModule.default || phaserModule;
      const StageScene = sceneModule.createStageScene(Phaser);
      stageReady = false;
      stageFirstRender = false;

      stageGame = new Phaser.Game({
        type: Phaser.CANVAS,
        parent: stageHost,
        width: gameWidth,
        height: gameHeight,
        backgroundColor: STAGE_DEBUG ? STAGE_DEBUG_BACKGROUND : 'rgba(0,0,0,0)',
        transparent: !STAGE_DEBUG,
        scene: StageScene,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: gameWidth,
          height: gameHeight
        },
        render: {
          antialias: false,
          pixelArt: true
        },
        audio: {
          noAudio: true
        }
      });
      debugStage('Phaser game created', {
        rendererType: stageGame.renderer?.type,
        parent: hostRect(),
        canvas: canvasInfo(stageGame.canvas || stageGame.renderer?.canvas),
        backgroundColor: STAGE_DEBUG ? STAGE_DEBUG_BACKGROUND : 'rgba(0,0,0,0)',
        transparent: !STAGE_DEBUG
      });

      stageGame.events.once('stage-ready', () => {
        stageReady = true;
        stageScene = getScene();
        debugStage('StageScene ready emitted', {
          parent: hostRect(),
          canvas: canvasInfo(stageGame.canvas || stageGame.renderer?.canvas)
        });
        if (stageGetState) syncStageState(stageGetState());
      });

      stageGame.events.once('stage-first-render', () => {
        stageFirstRender = true;
        debugStage('StageScene first render tick', {
          parent: hostRect(),
          canvas: canvasInfo(stageGame.canvas || stageGame.renderer?.canvas)
        });
        setTimeout(() => validateOrRetry(), 80);
      });

      stageWatchdogId = setTimeout(() => {
        if (!stageReady) failStageFallback('Phaser demorou para emitir ready. Mantendo palco DOM antigo.');
        else if (!stageFirstRender) failStageFallback('Phaser demorou para renderizar o primeiro frame. Mantendo palco DOM antigo.');
      }, 2400);

      return stageGame;
    }).catch(error => {
      failStageFallback('Falha ao carregar Phaser. O palco DOM antigo continua ativo.', error);
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
    stageReady = false;
    stageFirstRender = false;
    if (stageWatchdogId) clearTimeout(stageWatchdogId);
    if (stageValidationId) clearTimeout(stageValidationId);
    stageWatchdogId = null;
    stageValidationId = null;
    applyEnabledClass(false);
  }
}
