import { STAGE_BASE_HEIGHT, STAGE_BASE_WIDTH, STAGE_COLORS, STAGE_DEBUG, STAGE_DEBUG_COLORS, STAGE_DEBUG_TEXT } from './stageConfig.js';
import { STAGE_ASSETS } from './stageAssets.js';

const SPRITE_UNITS = {
  goblin: { x: 338, y: 510, scale: 0.82, idle: 'goblinIdle', attack: 'goblinAttack' },
  skeleton: { x: 486, y: 500, scale: 0.9, idle: 'skeletonIdle', attack: 'skeletonAttack' }
};

const MARKERS = {
  witch: { x: 610, y: 430, color: 0xb66cff },
  necromancer: { x: 730, y: 470, color: 0xff4765 },
  gargoyle: { x: 210, y: 288, color: 0x9ca7bd },
  demon: { x: 845, y: 500, color: 0xff294d },
  dragon: { x: 735, y: 188, color: 0x7e7cff },
  portal: { x: 575, y: 390, color: 0xff294d },
  lich: { x: 410, y: 415, color: 0xa9f2ff },
  god: { x: 650, y: 360, color: 0xffd681 }
};

export function createStageScene(Phaser) {
  return class StageScene extends Phaser.Scene {
    constructor() {
      super('StageScene');
      this.visualState = {};
      this.ready = false;
      this.particles = [];
      this.units = {};
      this.markers = {};
      this.lastAttackIndex = 0;
      this.firstRenderEmitted = false;
    }

    preload() {
      if (STAGE_DEBUG) {
        console.info('[Palco Phaser][debug] StageScene preload started');
        return;
      }
      this.load.spritesheet('goblinIdle', STAGE_ASSETS.goblin.idle, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet('goblinAttack', STAGE_ASSETS.goblin.attack, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet('skeletonIdle', STAGE_ASSETS.skeleton.idle, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet('skeletonAttack', STAGE_ASSETS.skeleton.attack, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet('knightWalk', STAGE_ASSETS.knight.walk, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet('knightHit', STAGE_ASSETS.knight.hit, { frameWidth: 128, frameHeight: 128 });
    }

    create() {
      if (STAGE_DEBUG) console.info('[Palco Phaser][debug] StageScene create started');
      this.cameras.main.setBackgroundColor(STAGE_DEBUG ? '#102040' : 'rgba(0,0,0,0)');
      if (STAGE_DEBUG) {
        this.debugGraphics = this.add.graphics();
        this.debugText = this.add.text(0, 0, STAGE_DEBUG_TEXT, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '34px',
          fontStyle: 'bold',
          color: STAGE_DEBUG_COLORS.text,
          stroke: '#000000',
          strokeThickness: 5
        });
        this.debugText.setOrigin(0.5, 0);
        this.scale.on('resize', this.resizeStage, this);
        this.resizeStage(this.scale.gameSize);
        this.ready = true;
        console.info('[Palco Phaser][debug] StageScene ready emitted');
        this.game.events.emit('stage-ready');
        return;
      }
      this.layers = {
        backdrop: this.add.container(0, 0),
        world: this.add.container(0, 0),
        units: this.add.container(0, 0),
        effects: this.add.container(0, 0)
      };
      this.layers.effects.setDepth(20);

      this.backdrop = this.add.graphics();
      this.worldMarks = this.add.graphics();
      this.layers.backdrop.add(this.backdrop);
      this.layers.world.add(this.worldMarks);

      this.createAnimations();
      this.drawBackdrop(false);
      this.createAmbientParticles();
      this.createHero();
      this.createSpriteUnits();
      this.createMarkers();

      this.scale.on('resize', this.resizeStage, this);
      this.resizeStage(this.scale.gameSize);
      this.time.addEvent({ delay: 1800, loop: true, callback: () => this.runAmbientAttack() });
      this.ready = true;
      this.game.events.emit('stage-ready');
    }

    createAnimations() {
      const makeAnim = (key, sheet, frameRate = 7, repeat = -1) => {
        if (this.anims.exists(key)) return;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(sheet, { start: 0, end: 3 }),
          frameRate,
          repeat
        });
      };
      makeAnim('goblin-idle', 'goblinIdle', 6, -1);
      makeAnim('goblin-attack', 'goblinAttack', 10, 0);
      makeAnim('skeleton-idle', 'skeletonIdle', 5, -1);
      makeAnim('skeleton-attack', 'skeletonAttack', 9, 0);
      makeAnim('knight-walk', 'knightWalk', 7, -1);
      makeAnim('knight-hit', 'knightHit', 10, 0);
    }

    update(time, delta) {
      if (STAGE_DEBUG) {
        if (!this.firstRenderEmitted) {
          this.firstRenderEmitted = true;
          this.game.events.emit('stage-first-render');
        }
        return;
      }
      for (const particle of this.particles) {
        particle.y -= particle.speed * delta;
        particle.x += Math.sin(time * 0.001 + particle.phase) * 0.01 * delta;
        if (particle.y < 120) {
          particle.y = 560 + Math.random() * 80;
          particle.x = 160 + Math.random() * 980;
        }
      }
      if (this.dragonShadow?.visible) {
        this.dragonShadow.x += delta * 0.025;
        if (this.dragonShadow.x > 1000) this.dragonShadow.x = 360;
      }
    }

    resizeStage(gameSize) {
      const width = gameSize?.width || this.scale.width || STAGE_BASE_WIDTH;
      const height = gameSize?.height || this.scale.height || STAGE_BASE_HEIGHT;
      if (STAGE_DEBUG) {
        this.cameras.main.setViewport(0, 0, width, height);
        this.cameras.main.setZoom(1);
        this.cameras.main.scrollX = 0;
        this.cameras.main.scrollY = 0;
        this.drawDebugScene(width, height);
        return;
      }
      const zoom = Math.max(width / STAGE_BASE_WIDTH, height / STAGE_BASE_HEIGHT);
      this.cameras.main.setViewport(0, 0, width, height);
      this.cameras.main.setZoom(zoom);
      this.cameras.main.centerOn(STAGE_BASE_WIDTH / 2, STAGE_BASE_HEIGHT / 2);
    }

    drawDebugScene(width, height) {
      if (!this.debugGraphics) return;
      this.debugGraphics.clear();
      this.debugGraphics.fillStyle(STAGE_DEBUG_COLORS.background, 1);
      this.debugGraphics.fillRect(0, 0, width, height);
      this.debugGraphics.fillStyle(STAGE_DEBUG_COLORS.topLeft, 1);
      this.debugGraphics.fillRect(18, 18, Math.max(110, width * 0.14), Math.max(78, height * 0.12));
      this.debugGraphics.fillStyle(STAGE_DEBUG_COLORS.center, 1);
      this.debugGraphics.fillRect(width / 2 - 120, height / 2 - 70, 240, 140);
      this.debugGraphics.fillStyle(STAGE_DEBUG_COLORS.right, 1);
      this.debugGraphics.fillCircle(width - Math.max(70, width * 0.09), height / 2, Math.max(36, Math.min(width, height) * 0.07));
      this.debugGraphics.lineStyle(6, STAGE_DEBUG_COLORS.border, 1);
      this.debugGraphics.strokeRect(3, 3, Math.max(1, width - 6), Math.max(1, height - 6));
      this.debugText?.setPosition(width / 2, 24);
      this.debugText?.setDepth(10);
    }

    syncVisualState(nextState = {}) {
      if (STAGE_DEBUG) {
        this.visualState = nextState;
        return;
      }
      this.visualState = nextState;
      if (!this.ready) return;
      const flags = nextState.visualFlags || {};
      this.drawBackdrop(Boolean(flags.bloodMoon || nextState.bloodMoonActive));
      this.drawWorldMarks(flags);
      this.setUnitVisible('goblin', Boolean(flags.hasGoblins));
      this.setUnitVisible('skeleton', Boolean(flags.hasSkeletons));
      for (const id of Object.keys(MARKERS)) {
        this.markers[id]?.setVisible(Boolean(flags[`has${id[0].toUpperCase()}${id.slice(1)}s`] || flags[id] || flags[`${id}s`] || nextState.producers?.[id] > 0));
      }
      this.dragonShadow?.setVisible(Boolean(flags.dragonShadow));
    }

    handleRitualClick() {
      if (!this.ready) return;
      if (STAGE_DEBUG) return;
      this.spawnRitualPulse();
      this.heroImpact(true);
    }

    handlePurchase(payload = {}) {
      if (!this.ready) return;
      if (STAGE_DEBUG) return;
      if (payload.id === 'goblin' || payload.id === 'skeleton') {
        this.setUnitVisible(payload.id, true);
        this.attackWithUnit(payload.id);
      } else {
        this.spawnSoftBurst(640, 520);
      }
    }

    drawBackdrop(bloodMoonActive) {
      this.backdrop.clear();
      this.backdrop.fillGradientStyle(0x254a70, 0x254a70, 0x16243a, 0x0d1020, 0.2);
      this.backdrop.fillRect(0, 0, STAGE_BASE_WIDTH, STAGE_BASE_HEIGHT);
      this.backdrop.fillStyle(bloodMoonActive ? STAGE_COLORS.bloodMoon : STAGE_COLORS.moon, bloodMoonActive ? 0.15 : 0.1);
      this.backdrop.fillCircle(1020, 132, 96);
      this.backdrop.fillStyle(bloodMoonActive ? STAGE_COLORS.bloodMoon : STAGE_COLORS.moon, bloodMoonActive ? 0.38 : 0.26);
      this.backdrop.fillCircle(1020, 132, 38);
      this.backdrop.lineStyle(3, bloodMoonActive ? STAGE_COLORS.bloodMoon : STAGE_COLORS.combatZone, bloodMoonActive ? 0.28 : 0.16);
      this.backdrop.strokeEllipse(630, 525, 420, 112);
      this.backdrop.fillStyle(bloodMoonActive ? 0x8f1026 : STAGE_COLORS.soul, bloodMoonActive ? 0.1 : 0.045);
      this.backdrop.fillEllipse(630, 585, 760, 150);
      if (bloodMoonActive) {
        this.backdrop.fillStyle(0x8f1026, 0.12);
        this.backdrop.fillRect(0, 0, STAGE_BASE_WIDTH, STAGE_BASE_HEIGHT);
      }
    }

    drawWorldMarks(flags = {}) {
      this.worldMarks.clear();
      if (flags.bones || flags.hasSkeletons) {
        this.worldMarks.lineStyle(4, 0xd8d0b9, 0.5);
        this.worldMarks.strokeLineShape(new Phaser.Geom.Line(235, 570, 290, 546));
        this.worldMarks.strokeLineShape(new Phaser.Geom.Line(255, 590, 310, 610));
        this.worldMarks.fillStyle(0xd8d0b9, 0.5);
        this.worldMarks.fillCircle(226, 574, 8);
        this.worldMarks.fillCircle(314, 612, 7);
      }
      if (flags.witchcraft || flags.necromancy) {
        const color = flags.necromancy ? 0xff4765 : 0xb66cff;
        this.worldMarks.lineStyle(3, color, 0.34);
        this.worldMarks.strokeCircle(600, 535, 58);
        this.worldMarks.strokeCircle(600, 535, 30);
        this.worldMarks.fillStyle(color, 0.055);
        this.worldMarks.fillCircle(600, 535, 78);
      }
      if (flags.gargoyles) {
        this.worldMarks.fillStyle(0x09090f, 0.38);
        this.worldMarks.fillTriangle(175, 300, 205, 255, 235, 300);
        this.worldMarks.fillTriangle(1025, 300, 1055, 255, 1085, 300);
      }
      if (flags.bloodContracts) {
        this.worldMarks.lineStyle(3, 0xff294d, 0.38);
        this.worldMarks.strokeCircle(830, 555, 36);
        this.worldMarks.strokeLineShape(new Phaser.Geom.Line(805, 530, 855, 580));
        this.worldMarks.strokeLineShape(new Phaser.Geom.Line(855, 530, 805, 580));
      }
    }

    createHero() {
      const shadow = this.add.ellipse(890, 558, 92, 20, 0x000000, 0.34);
      const hero = this.add.sprite(890, 500, 'knightWalk');
      hero.setScale(0.95);
      hero.play('knight-walk');
      this.hero = hero;
      this.heroShadow = shadow;
      this.hpBack = this.add.rectangle(890, 402, 104, 10, 0x13090f, 0.82).setStrokeStyle(2, 0x2b1822);
      this.hpFill = this.add.rectangle(888, 402, 88, 5, 0xffd681, 0.92);
      this.layers.units.add([shadow, hero, this.hpBack, this.hpFill]);
      this.tweens.add({ targets: [hero, shadow], y: '-=5', duration: 1150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    createSpriteUnits() {
      for (const [id, config] of Object.entries(SPRITE_UNITS)) {
        const shadow = this.add.ellipse(config.x, config.y + 54, 80, 18, 0x000000, 0.32);
        const sprite = this.add.sprite(config.x, config.y, config.idle);
        sprite.setScale(config.scale);
        sprite.play(`${id}-idle`);
        const group = this.add.container(0, 0, [shadow, sprite]);
        group.setVisible(false);
        group.sprite = sprite;
        group.shadow = shadow;
        group.baseX = config.x;
        group.baseY = config.y;
        this.units[id] = group;
        this.layers.units.add(group);
      }
    }

    createMarkers() {
      for (const [id, marker] of Object.entries(MARKERS)) {
        const group = this.add.container(marker.x, marker.y);
        const glow = this.add.circle(0, 0, 28, marker.color, 0.08);
        const body = this.add.circle(0, 0, 10, marker.color, 0.2).setStrokeStyle(2, marker.color, 0.32);
        group.add([glow, body]);
        group.setVisible(false);
        this.markers[id] = group;
        this.layers.world.add(group);
        this.tweens.add({ targets: group, alpha: 0.45, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      this.dragonShadow = this.add.container(420, 185);
      this.dragonShadow.add([
        this.add.ellipse(0, 0, 190, 30, 0x05060d, 0.22),
        this.add.triangle(-35, 0, -125, -44, -60, 12, 0x05060d, 0.22),
        this.add.triangle(35, 0, 125, -44, 60, 12, 0x05060d, 0.22)
      ]);
      this.dragonShadow.setVisible(false);
      this.layers.world.add(this.dragonShadow);
    }

    setUnitVisible(id, visible) {
      if (!this.units[id]) return;
      this.units[id].setVisible(visible);
    }

    createAmbientParticles() {
      for (let i = 0; i < 26; i += 1) {
        const particle = this.add.circle(160 + Math.random() * 980, 150 + Math.random() * 410, 1.5 + Math.random() * 2.5, STAGE_COLORS.soul, 0.22);
        particle.speed = 0.006 + Math.random() * 0.015;
        particle.phase = Math.random() * Math.PI * 2;
        this.layers.effects.add(particle);
        this.particles.push(particle);
      }
    }

    runAmbientAttack() {
      const activeIds = Object.keys(this.units).filter(id => this.units[id].visible);
      if (!activeIds.length) return;
      this.lastAttackIndex = (this.lastAttackIndex + 1) % activeIds.length;
      this.attackWithUnit(activeIds[this.lastAttackIndex]);
    }

    attackWithUnit(id) {
      const unit = this.units[id];
      if (!unit?.visible) return;
      unit.sprite.play(`${id}-attack`);
      unit.sprite.once('animationcomplete', () => unit.sprite.play(`${id}-idle`));
      this.tweens.add({
        targets: [unit.sprite, unit.shadow],
        x: '+=18',
        duration: 120,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
      this.spawnSoftBurst(820, 462);
      this.heroImpact(false);
    }

    handleRitualImpactTween(strong) {
      const knockback = strong ? 18 : 8;
      this.tweens.add({
        targets: [this.hero, this.heroShadow, this.hpBack, this.hpFill],
        x: `+=${knockback}`,
        alpha: strong ? 0.72 : 0.86,
        duration: strong ? 70 : 90,
        yoyo: true,
        repeat: strong ? 2 : 0,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.hero.setAlpha(1);
          this.hero.setX(890);
          this.heroShadow.setX(890);
          this.hpBack.setX(890);
          this.hpFill.setX(888);
          this.hero.play('knight-walk');
        }
      });
    }

    heroImpact(strong = true) {
      this.hero.play('knight-hit');
      this.handleRitualImpactTween(strong);
      this.spawnSoftBurst(820, 462);
    }

    spawnRitualPulse() {
      const pulse = this.add.circle(505, 525, 10, STAGE_COLORS.soul, 0.78);
      this.layers.effects.add(pulse);
      this.tweens.add({
        targets: pulse,
        x: 820,
        y: 462,
        scale: 2.4,
        alpha: 0,
        duration: 430,
        ease: 'Cubic.easeOut',
        onComplete: () => pulse.destroy()
      });
      this.spawnSoftBurst(820, 462);
    }

    spawnSoftBurst(x, y) {
      for (let i = 0; i < 5; i += 1) {
        const mote = this.add.circle(x, y, 3 + Math.random() * 3, STAGE_COLORS.soul, 0.66);
        this.layers.effects.add(mote);
        this.tweens.add({
          targets: mote,
          x: x + Phaser.Math.Between(-55, 55),
          y: y - Phaser.Math.Between(24, 82),
          alpha: 0,
          scale: 0.4,
          duration: Phaser.Math.Between(360, 700),
          ease: 'Sine.easeOut',
          onComplete: () => mote.destroy()
        });
      }
    }
  };
}
