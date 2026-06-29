import { STAGE_BASE_HEIGHT, STAGE_BASE_WIDTH, STAGE_COLORS, UNIT_POSITIONS } from './stageConfig.js';

const CREATURES = [
  { id: 'goblin', kind: 'goblin', x: 310, y: 520, scale: 0.9 },
  { id: 'skeleton', kind: 'skeleton', x: 470, y: 512, scale: 0.94 },
  { id: 'witch', kind: 'witch', x: 630, y: 470, scale: 0.92 },
  { id: 'necromancer', kind: 'necromancer', x: 775, y: 488, scale: 0.95 },
  { id: 'gargoyle', kind: 'gargoyle', x: 205, y: 292, scale: 0.82 },
  { id: 'demon', kind: 'demon', x: 875, y: 505, scale: 1.05 },
  { id: 'dragon', kind: 'dragon', x: 710, y: 205, scale: 1.05 },
  { id: 'portal', kind: 'portal', x: 570, y: 390, scale: 0.95 },
  { id: 'lich', kind: 'lich', x: 400, y: 405, scale: 0.95 },
  { id: 'god', kind: 'god', x: 655, y: 360, scale: 1 }
];

const CREATURE_NAMES = {
  goblin: 'Goblin Coletor',
  skeleton: 'Esqueleto Guardião',
  witch: 'Bruxa Aprendiz',
  necromancer: 'Necromante Subalterno',
  gargoyle: 'Gárgula Vigia',
  demon: 'Demônio Contratual',
  dragon: 'Dragão Espectral',
  portal: 'Portal Infernal',
  lich: 'Lich Ancestral',
  god: 'Deus Aprisionado'
};

export function createStageScene(Phaser) {
  return class StageScene extends Phaser.Scene {
    constructor() {
      super('StageScene');
      this.visualState = null;
      this.ready = false;
      this.ambientDots = [];
      this.units = new Map();
      this.visualFlags = {};
      this.lastBloodMoon = false;
    }

    create() {
      this.layers = {
        sky: this.add.container(0, 0),
        far: this.add.container(0, 0),
        structure: this.add.container(0, 0),
        ground: this.add.container(0, 0),
        monsters: this.add.container(0, 0),
        hero: this.add.container(0, 0),
        effects: this.add.container(0, 0),
        ui: this.add.container(0, 0)
      };

      this.skyGraphics = this.add.graphics();
      this.farGraphics = this.add.graphics();
      this.structureGraphics = this.add.graphics();
      this.groundGraphics = this.add.graphics();
      this.flagGraphics = this.add.graphics();
      this.layers.sky.add(this.skyGraphics);
      this.layers.far.add(this.farGraphics);
      this.layers.structure.add([this.structureGraphics, this.flagGraphics]);
      this.layers.effects.setDepth(80);
      this.layers.ui.setDepth(90);

      this.moonGlow = this.add.circle(1035, 128, 112, STAGE_COLORS.moon, 0.08);
      this.moon = this.add.circle(1035, 128, 42, STAGE_COLORS.moon, 0.95);
      this.layers.sky.add([this.moonGlow, this.moon]);

      this.zoneGlow = this.add.ellipse(675, 522, 430, 118, STAGE_COLORS.combatZone, 0.13);
      this.layers.ground.add(this.zoneGlow);

      this.hero = this.createHero();
      this.layers.hero.add(this.hero);
      this.hero.setPosition(1160, UNIT_POSITIONS.hero.y);
      this.tweens.add({ targets: this.hero, x: UNIT_POSITIONS.hero.x, duration: 900, ease: 'Cubic.easeOut' });

      for (const creature of CREATURES) {
        const unit = this.createCreatureUnit(creature);
        this.units.set(creature.id, unit);
        this.layers.monsters.add(unit);
      }

      this.createAmbientParticles();
      this.redrawStage(false);
      this.resizeStage(this.scale.gameSize);
      this.scale.on('resize', this.resizeStage, this);
      this.time.addEvent({ delay: 2100, loop: true, callback: () => this.runAmbientAttack() });
      this.ready = true;
      if (this.visualState) this.syncVisualState(this.visualState);
    }

    update(time, delta) {
      const drift = Math.sin(time * 0.00042);
      this.zoneGlow.setScale(1 + drift * 0.045, 1 + drift * 0.025);
      this.moonGlow.setAlpha((this.visualState?.bloodMoonActive ? 0.2 : 0.09) + Math.abs(drift) * 0.045);
      for (const dot of this.ambientDots) {
        dot.y -= dot.speed * delta;
        dot.x += Math.sin(time * 0.001 + dot.phase) * 0.018 * delta;
        if (dot.y < 120) {
          dot.y = 565 + Math.random() * 90;
          dot.x = 120 + Math.random() * 1040;
        }
      }
    }

    resizeStage(gameSize) {
      const width = gameSize?.width || this.scale.width || STAGE_BASE_WIDTH;
      const height = gameSize?.height || this.scale.height || STAGE_BASE_HEIGHT;
      const zoom = Math.max(width / STAGE_BASE_WIDTH, height / STAGE_BASE_HEIGHT);
      this.cameras.main.setViewport(0, 0, width, height);
      this.cameras.main.setZoom(zoom);
      this.cameras.main.centerOn(STAGE_BASE_WIDTH / 2, STAGE_BASE_HEIGHT / 2);
    }

    syncVisualState(nextState) {
      this.visualState = nextState || {};
      if (!this.ready) return;
      this.applyVisualState(this.visualState);

      const visuals = new Map((this.visualState.producerVisuals || []).map(item => [item.id, item]));
      for (const [id, unit] of this.units.entries()) {
        const item = visuals.get(id);
        const quantity = item?.quantity || this.visualState.producers?.[id] || 0;
        unit.setVisible(quantity > 0);
        unit.quantityText?.setText(quantity > 0 ? `x${quantity}` : '');
        unit.nameText?.setText(item?.name || CREATURE_NAMES[id] || id);
      }
    }

    applyVisualState(visualState = {}) {
      const flags = visualState.visualFlags || {};
      const bloodMoonActive = Boolean(visualState.bloodMoonActive || flags.bloodMoon);
      const changed = bloodMoonActive !== this.lastBloodMoon
        || JSON.stringify(flags) !== JSON.stringify(this.visualFlags);
      this.visualFlags = { ...flags };
      if (changed) {
        this.redrawStage(bloodMoonActive);
        this.lastBloodMoon = bloodMoonActive;
      }
      this.moon.setFillStyle(bloodMoonActive ? STAGE_COLORS.bloodMoon : STAGE_COLORS.moon, 0.96);
      this.moonGlow.setFillStyle(bloodMoonActive ? STAGE_COLORS.bloodMoon : STAGE_COLORS.moon, bloodMoonActive ? 0.2 : 0.09);
    }

    handleRitualClick(payload = {}) {
      if (!this.ready) return;
      this.spawnSoulPulse(payload);
      this.heroImpact();
      this.cameras.main.shake(90, 0.0018);
    }

    handlePurchase(payload = {}) {
      if (!this.ready) return;
      const unit = this.units.get(payload.id);
      if (!unit) {
        this.spawnSmallBurst(640, 505, STAGE_COLORS.soul);
        return;
      }
      unit.setVisible(true);
      this.tweens.add({
        targets: unit,
        scaleX: unit.baseScale * 1.12,
        scaleY: unit.baseScale * 1.12,
        duration: 120,
        yoyo: true,
        repeat: 1,
        ease: 'Back.easeOut',
        onComplete: () => unit.setScale(unit.baseScale)
      });
      this.spawnSmallBurst(unit.x, unit.y - 72, STAGE_COLORS.soul);
    }

    redrawStage(bloodMoonActive) {
      const top = bloodMoonActive ? 0x230713 : 0x101a33;
      const mid = bloodMoonActive ? 0x41101a : 0x18243e;
      const low = bloodMoonActive ? 0x12050a : 0x09070f;
      this.skyGraphics.clear();
      this.farGraphics.clear();
      this.structureGraphics.clear();
      this.groundGraphics.clear();
      this.flagGraphics.clear();

      this.skyGraphics.fillGradientStyle(top, top, mid, low, 1);
      this.skyGraphics.fillRect(0, 0, STAGE_BASE_WIDTH, STAGE_BASE_HEIGHT);
      this.skyGraphics.fillStyle(bloodMoonActive ? 0xff4966 : 0x7aa0ff, bloodMoonActive ? 0.055 : 0.04);
      this.skyGraphics.fillCircle(640, 345, 500);

      this.farGraphics.fillStyle(0x05060d, 0.36);
      this.farGraphics.fillTriangle(-80, 430, 210, 235, 500, 430);
      this.farGraphics.fillTriangle(340, 430, 680, 230, 1010, 430);
      this.farGraphics.fillTriangle(790, 430, 1110, 255, 1360, 430);
      this.farGraphics.fillStyle(0x07060c, 0.66);
      this.farGraphics.fillRect(0, 390, STAGE_BASE_WIDTH, 44);

      this.structureGraphics.fillStyle(0x0a0810, 0.92);
      this.drawBattlement(this.structureGraphics, 80, 312, 210, 120);
      this.drawBattlement(this.structureGraphics, 950, 300, 250, 136);
      this.structureGraphics.fillStyle(0x120b13, 0.78);
      this.structureGraphics.fillRect(0, 414, STAGE_BASE_WIDTH, 40);
      this.structureGraphics.fillStyle(bloodMoonActive ? 0xff3858 : 0xffc56d, bloodMoonActive ? 0.18 : 0.08);
      for (let i = 0; i < 12; i += 1) {
        this.structureGraphics.fillRect(95 + i * 86, 388 + (i % 3) * 7, 18, 24);
      }

      this.groundGraphics.fillStyle(0x172417, 1);
      this.groundGraphics.fillRect(0, 430, STAGE_BASE_WIDTH, 290);
      this.groundGraphics.fillStyle(0x273c28, 0.95);
      this.groundGraphics.fillEllipse(650, 605, 940, 250);
      this.groundGraphics.fillStyle(0x5a3828, 0.9);
      this.groundGraphics.fillEllipse(675, 622, 650, 145);
      this.groundGraphics.lineStyle(3, bloodMoonActive ? STAGE_COLORS.bloodMoon : STAGE_COLORS.combatZone, 0.3);
      this.groundGraphics.strokeEllipse(675, 522, 430, 118);
      this.groundGraphics.lineStyle(2, 0xf6d38b, 0.1);
      for (let i = 0; i < 9; i += 1) {
        this.groundGraphics.beginPath();
        this.groundGraphics.moveTo(370 + i * 70, 575);
        this.groundGraphics.lineTo(318 + i * 72, 650);
        this.groundGraphics.strokePath();
      }

      if (this.visualFlags.bones) this.drawBones();
      if (this.visualFlags.witchcraft || this.visualFlags.necromancy) this.drawRunes(bloodMoonActive);
      if (this.visualFlags.dragonShadow) this.drawDragonShadow();
      if (this.visualFlags.bloodContracts) this.drawContractSeal();
    }

    drawBattlement(graphics, x, y, width, height) {
      graphics.fillRect(x, y + 32, width, height - 32);
      for (let i = 0; i < width; i += 34) {
        graphics.fillRect(x + i, y, 20, 38);
      }
      graphics.fillStyle(0x211423, 0.62);
      graphics.fillRect(x + width * 0.18, y + 58, 34, 50);
      graphics.fillRect(x + width * 0.62, y + 68, 30, 42);
      graphics.fillStyle(0x0a0810, 0.92);
    }

    drawBones() {
      this.flagGraphics.lineStyle(5, 0xd8d0b9, 0.55);
      this.flagGraphics.strokeLineShape(new Phaser.Geom.Line(220, 575, 275, 548));
      this.flagGraphics.strokeLineShape(new Phaser.Geom.Line(252, 582, 300, 606));
      this.flagGraphics.fillStyle(0xd8d0b9, 0.5);
      this.flagGraphics.fillCircle(212, 580, 10);
      this.flagGraphics.fillCircle(302, 607, 8);
      this.flagGraphics.lineStyle(4, 0x8f8065, 0.6);
      this.flagGraphics.strokeLineShape(new Phaser.Geom.Line(520, 560, 520, 500));
      this.flagGraphics.strokeTriangle(520, 488, 506, 512, 534, 512);
    }

    drawRunes(bloodMoonActive) {
      const color = bloodMoonActive ? 0xff4966 : 0xb66cff;
      this.flagGraphics.lineStyle(3, color, 0.36);
      this.flagGraphics.strokeCircle(625, 532, 58);
      this.flagGraphics.strokeCircle(625, 532, 32);
      this.flagGraphics.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = -Math.PI / 2 + i * Math.PI / 3;
        const x = 625 + Math.cos(angle) * 58;
        const y = 532 + Math.sin(angle) * 58;
        if (i === 0) this.flagGraphics.moveTo(x, y);
        else this.flagGraphics.lineTo(x, y);
      }
      this.flagGraphics.closePath();
      this.flagGraphics.strokePath();
      this.flagGraphics.fillStyle(color, 0.08);
      this.flagGraphics.fillCircle(625, 532, 82);
    }

    drawDragonShadow() {
      this.flagGraphics.fillStyle(0x03030a, 0.42);
      this.flagGraphics.fillEllipse(710, 170, 250, 38);
      this.flagGraphics.fillTriangle(610, 170, 520, 115, 660, 184);
      this.flagGraphics.fillTriangle(790, 168, 905, 110, 750, 185);
      this.flagGraphics.fillTriangle(835, 170, 920, 165, 840, 190);
    }

    drawContractSeal() {
      this.flagGraphics.lineStyle(4, 0xff304f, 0.42);
      this.flagGraphics.strokeCircle(870, 550, 42);
      this.flagGraphics.strokeLineShape(new Phaser.Geom.Line(840, 520, 900, 580));
      this.flagGraphics.strokeLineShape(new Phaser.Geom.Line(900, 520, 840, 580));
    }

    createAmbientParticles() {
      for (let i = 0; i < 36; i += 1) {
        const dot = this.add.circle(100 + Math.random() * 1080, 150 + Math.random() * 470, 1.2 + Math.random() * 2.8, STAGE_COLORS.soul, 0.12 + Math.random() * 0.2);
        dot.speed = 0.008 + Math.random() * 0.024;
        dot.phase = Math.random() * Math.PI * 2;
        this.layers.effects.add(dot);
        this.ambientDots.push(dot);
      }
    }

    createHero() {
      const hero = this.add.container(UNIT_POSITIONS.hero.x, UNIT_POSITIONS.hero.y);
      hero.baseScale = 1;
      hero.add(this.add.ellipse(0, 58, 108, 24, 0x000000, 0.34));
      hero.add(this.add.circle(0, -84, 54, 0xffd77a, 0.08));
      hero.add(this.add.rectangle(0, -18, 54, 88, 0x6f7f93).setStrokeStyle(5, 0x171b23));
      hero.add(this.add.triangle(0, -70, -31, -48, 31, -48, 0, -112, 0xbec8d0).setStrokeStyle(5, 0x171b23));
      hero.add(this.add.circle(0, -68, 21, 0xe8c097).setStrokeStyle(4, 0x22120e));
      hero.add(this.add.rectangle(48, -12, 8, 112, 0xe7edf1).setAngle(-16).setStrokeStyle(2, 0x1b1b1d));
      hero.add(this.add.triangle(58, -76, 48, -112, 70, -82, 0xe7edf1).setAngle(-16).setStrokeStyle(2, 0x1b1b1d));
      hero.add(this.add.ellipse(-42, -10, 38, 58, 0x9d2639).setStrokeStyle(5, 0x1b080d));
      hero.add(this.add.rectangle(-14, 34, 15, 46, 0x273040).setStrokeStyle(3, 0x11151d));
      hero.add(this.add.rectangle(18, 34, 15, 46, 0x273040).setStrokeStyle(3, 0x11151d));
      const hpBack = this.add.rectangle(0, -138, 104, 10, 0x120910, 0.86).setStrokeStyle(2, 0x2b1822);
      const hp = this.add.rectangle(-2, -138, 92, 5, 0xffd681, 0.95);
      hero.add([hpBack, hp]);
      this.tweens.add({ targets: hero, y: UNIT_POSITIONS.hero.y - 6, duration: 1120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return hero;
    }

    createCreatureUnit(creature) {
      const unit = this.add.container(creature.x, creature.y);
      unit.baseScale = creature.scale;
      unit.setScale(creature.scale);
      unit.setVisible(false);
      this.drawCreature(unit, creature.kind);
      const label = this.createNameplate(CREATURE_NAMES[creature.id] || creature.id);
      label.y = creature.kind === 'dragon' || creature.kind === 'gargoyle' ? -86 : -138;
      unit.add(label);
      unit.nameText = label.nameText;
      unit.quantityText = label.quantityText;
      this.tweens.add({
        targets: unit,
        y: creature.y - (creature.kind === 'dragon' || creature.kind === 'gargoyle' ? 8 : 5),
        duration: 900 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      return unit;
    }

    createNameplate(name) {
      const wrap = 154;
      const plate = this.add.container(0, 0);
      const bg = this.add.rectangle(0, 0, wrap + 18, 38, 0x08050a, 0.72).setStrokeStyle(2, 0xffd681, 0.28);
      const text = this.add.text(0, -6, name, {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: '#ffe6b2',
        align: 'center',
        wordWrap: { width: wrap, useAdvancedWrap: true },
        lineSpacing: -2
      }).setOrigin(0.5);
      const qty = this.add.text(0, 13, '', {
        fontFamily: 'Inter, system-ui',
        fontSize: '12px',
        color: '#b9f6ff',
        align: 'center'
      }).setOrigin(0.5);
      plate.add([bg, text, qty]);
      plate.nameText = text;
      plate.quantityText = qty;
      return plate;
    }

    drawCreature(unit, kind) {
      unit.add(this.add.ellipse(0, 50, 105, 22, 0x000000, 0.3));
      const rim = this.add.circle(0, -42, 70, this.colorForKind(kind), 0.07);
      unit.add(rim);
      if (kind === 'goblin') this.drawGoblin(unit);
      else if (kind === 'skeleton') this.drawSkeleton(unit);
      else if (kind === 'witch') this.drawWitch(unit);
      else if (kind === 'necromancer') this.drawNecromancer(unit);
      else if (kind === 'gargoyle') this.drawGargoyle(unit);
      else if (kind === 'demon') this.drawDemon(unit);
      else if (kind === 'dragon') this.drawDragon(unit);
      else if (kind === 'portal') this.drawPortal(unit);
      else if (kind === 'lich') this.drawLich(unit);
      else this.drawGod(unit);
    }

    colorForKind(kind) {
      return {
        goblin: 0x69d35b,
        skeleton: 0xa9f2ff,
        witch: 0xc46cff,
        necromancer: 0xff4d7a,
        gargoyle: 0x9ca7bd,
        demon: 0xff334f,
        dragon: 0x7e7cff,
        portal: 0xff3559,
        lich: 0xa9f2ff,
        god: 0xffd681
      }[kind] || 0xffffff;
    }

    drawGoblin(unit) {
      unit.setRotation(-0.05);
      unit.add(this.add.triangle(-29, -58, 0, 0, -36, 8, 2, 17, 0x68bb53).setStrokeStyle(4, 0x10210d));
      unit.add(this.add.triangle(29, -58, 0, 0, 36, 8, -2, 17, 0x68bb53).setStrokeStyle(4, 0x10210d));
      unit.add(this.add.circle(0, -60, 27, 0x68bb53).setStrokeStyle(5, 0x10210d));
      unit.add(this.add.circle(-10, -64, 4, 0xffe15f));
      unit.add(this.add.circle(10, -64, 4, 0xffe15f));
      unit.add(this.add.rectangle(0, -16, 48, 46, 0x6b3a26).setStrokeStyle(5, 0x160c08));
      unit.add(this.add.rectangle(38, -10, 40, 8, 0xd8d8c8).setAngle(-24).setStrokeStyle(2, 0x151515));
      unit.add(this.add.circle(-33, 8, 17, 0xb88945).setStrokeStyle(4, 0x2b1a0e));
    }

    drawSkeleton(unit) {
      unit.add(this.add.circle(0, -76, 27, STAGE_COLORS.skeleton).setStrokeStyle(5, 0x241f1b));
      unit.add(this.add.circle(-9, -80, 4, 0x79eaff));
      unit.add(this.add.circle(9, -80, 4, 0x79eaff));
      unit.add(this.add.rectangle(0, -24, 38, 60, STAGE_COLORS.skeleton).setStrokeStyle(5, 0x241f1b));
      for (let i = 0; i < 4; i += 1) unit.add(this.add.line(0, -42 + i * 12, -24, 0, 24, 0, 0x241f1b, 0.8).setLineWidth(3));
      unit.add(this.add.rectangle(43, -18, 7, 128, 0x806b4a).setStrokeStyle(2, 0x23190e));
      unit.add(this.add.triangle(43, -92, 0, -22, 16, 18, -16, 18, 0xcfcfc8).setStrokeStyle(2, 0x23190e));
      unit.add(this.add.ellipse(-35, -10, 32, 46, 0x41516b).setStrokeStyle(5, 0x181d26));
    }

    drawWitch(unit) {
      unit.add(this.add.triangle(0, -105, -55, -55, 55, -55, 0, -138, 0x231333).setStrokeStyle(5, 0x09040d));
      unit.add(this.add.rectangle(0, -55, 92, 12, 0x09040d));
      unit.add(this.add.circle(0, -48, 20, 0xbda27a).setStrokeStyle(4, 0x0a0507));
      unit.add(this.add.triangle(0, -18, -44, 54, 44, 54, 0, -66, 0x4b246b).setStrokeStyle(6, 0x100618));
      unit.add(this.add.rectangle(48, -18, 7, 116, 0x7a4d2b).setStrokeStyle(2, 0x160d08));
      unit.add(this.add.circle(54, -78, 20, 0xff4f86, 0.32).setStrokeStyle(4, 0xff4f86, 0.7));
    }

    drawNecromancer(unit) {
      unit.add(this.add.circle(0, -38, 58, 0xff2d5d, 0.08).setStrokeStyle(3, 0xff2d5d, 0.24));
      unit.add(this.add.triangle(0, -98, -36, -54, 36, -54, 0, -130, 0x17101f).setStrokeStyle(5, 0x050308));
      unit.add(this.add.circle(0, -52, 17, 0xd6c4a4).setStrokeStyle(4, 0x0a0507));
      unit.add(this.add.rectangle(0, 0, 58, 86, 0x26143b).setStrokeStyle(6, 0x09040d));
      unit.add(this.add.rectangle(47, -12, 8, 126, 0x6d5030).setStrokeStyle(2, 0x140c08));
      unit.add(this.add.rectangle(-38, 8, 38, 28, 0x7d2730).setStrokeStyle(4, 0x160608));
    }

    drawGargoyle(unit) {
      unit.add(this.add.triangle(-24, -22, -112, -58, -42, 16, 0x343544).setStrokeStyle(4, 0x141620));
      unit.add(this.add.triangle(24, -22, 112, -58, 42, 16, 0x343544).setStrokeStyle(4, 0x141620));
      unit.add(this.add.rectangle(0, -10, 56, 62, 0x5a5e70).setStrokeStyle(5, 0x171923));
      unit.add(this.add.circle(0, -58, 24, 0x777b8e).setStrokeStyle(5, 0x171923));
      unit.add(this.add.circle(-8, -61, 3, 0xffd681));
      unit.add(this.add.circle(8, -61, 3, 0xffd681));
    }

    drawDemon(unit) {
      unit.add(this.add.triangle(-18, -95, -42, -136, -4, -104, 0x070307));
      unit.add(this.add.triangle(18, -95, 42, -136, 4, -104, 0x070307));
      unit.add(this.add.circle(0, -82, 30, 0x280712).setStrokeStyle(5, 0x070307));
      unit.add(this.add.circle(-10, -86, 4, 0xffd681));
      unit.add(this.add.circle(10, -86, 4, 0xffd681));
      unit.add(this.add.rectangle(0, -12, 68, 100, 0x160610).setStrokeStyle(6, 0x050204));
      unit.add(this.add.circle(0, -10, 20, 0xff294d, 0.2).setStrokeStyle(3, 0xff294d, 0.45));
      unit.add(this.add.rectangle(-48, 12, 34, 44, 0x3b1620).setAngle(-12).setStrokeStyle(3, 0xff304f, 0.35));
    }

    drawDragon(unit) {
      unit.add(this.add.ellipse(0, -24, 150, 40, 0x111326).setStrokeStyle(5, 0x070812));
      unit.add(this.add.triangle(-40, -28, -150, -86, -74, -5, 0x161936).setStrokeStyle(4, 0x070812));
      unit.add(this.add.triangle(28, -26, 152, -90, 72, -6, 0x161936).setStrokeStyle(4, 0x070812));
      unit.add(this.add.circle(82, -34, 25, 0x15162b).setStrokeStyle(4, 0x070812));
      unit.add(this.add.triangle(110, -34, 158, -44, 112, -16, 0x15162b).setStrokeStyle(4, 0x070812));
      unit.add(this.add.circle(91, -39, 4, 0xffd681));
    }

    drawPortal(unit) {
      unit.add(this.add.ellipse(0, -26, 76, 138, 0x330817, 0.95).setStrokeStyle(7, 0xff294d, 0.65));
      unit.add(this.add.ellipse(0, -26, 42, 100, 0xff294d, 0.18));
      unit.add(this.add.circle(0, -26, 22, 0xffd681, 0.08));
    }

    drawLich(unit) {
      unit.add(this.add.circle(0, -55, 58, 0xa9f2ff, 0.08).setStrokeStyle(3, 0xa9f2ff, 0.24));
      unit.add(this.add.rectangle(0, -2, 58, 104, 0x171325).setStrokeStyle(6, 0x050308));
      unit.add(this.add.circle(0, -72, 25, 0xd8d0b9).setStrokeStyle(5, 0x201b18));
      unit.add(this.add.rectangle(0, -104, 58, 12, 0xd8b15d).setStrokeStyle(3, 0x39270d));
      unit.add(this.add.circle(-8, -75, 4, 0xa9f2ff));
      unit.add(this.add.circle(8, -75, 4, 0xa9f2ff));
    }

    drawGod(unit) {
      unit.setAlpha(0.58);
      unit.add(this.add.circle(0, -54, 92, 0xffd681, 0.06).setStrokeStyle(4, 0xffd681, 0.15));
      unit.add(this.add.rectangle(0, -8, 90, 170, 0x070309).setStrokeStyle(8, 0x160810));
      unit.add(this.add.circle(0, -112, 44, 0x050306).setStrokeStyle(5, 0xff294d, 0.22));
      unit.add(this.add.line(0, -10, -115, 0, 115, 0, 0x30202a, 0.78).setLineWidth(10));
    }

    runAmbientAttack() {
      if (!this.ready) return;
      const active = [...this.units.values()].filter(unit => unit.visible);
      if (!active.length) return;
      const unit = active[Phaser.Math.Between(0, active.length - 1)];
      this.tweens.add({
        targets: unit,
        x: unit.x + 18,
        duration: 130,
        yoyo: true,
        ease: 'Sine.easeInOut',
        onYoyo: () => this.spawnSmallBurst(unit.x + 44, unit.y - 62, this.colorForKind('soul'))
      });
      this.heroImpact(false);
    }

    heroImpact(strong = true) {
      this.tweens.add({
        targets: this.hero,
        x: UNIT_POSITIONS.hero.x + (strong ? 18 : 8),
        alpha: strong ? 0.72 : 0.86,
        duration: strong ? 70 : 90,
        yoyo: true,
        repeat: strong ? 2 : 0,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.hero.setX(UNIT_POSITIONS.hero.x);
          this.hero.setAlpha(1);
        }
      });
      this.spawnSmallBurst(UNIT_POSITIONS.hero.x - 36, UNIT_POSITIONS.hero.y - 82, STAGE_COLORS.soul);
    }

    spawnSoulPulse() {
      const startX = 520;
      const startY = 530;
      const pulse = this.add.circle(startX, startY, 13, STAGE_COLORS.soul, 0.92);
      this.layers.effects.add(pulse);
      this.tweens.add({
        targets: pulse,
        x: UNIT_POSITIONS.hero.x - 40,
        y: UNIT_POSITIONS.hero.y - 82,
        scale: 2.6,
        alpha: 0,
        duration: 460,
        ease: 'Cubic.easeOut',
        onComplete: () => pulse.destroy()
      });
      const count = Phaser.Math.Between(4, 8);
      for (let i = 0; i < count; i += 1) {
        this.spawnSoulParticle(startX + Phaser.Math.Between(-26, 26), startY + Phaser.Math.Between(-18, 18));
      }
    }

    spawnSoulParticle(x, y) {
      const particle = this.add.circle(x, y, Phaser.Math.Between(3, 7), STAGE_COLORS.soul, 0.9);
      this.layers.effects.add(particle);
      this.tweens.add({
        targets: particle,
        x: x + Phaser.Math.Between(-90, 110),
        y: y - Phaser.Math.Between(45, 125),
        alpha: 0,
        scale: 0.25,
        duration: Phaser.Math.Between(430, 800),
        ease: 'Sine.easeOut',
        onComplete: () => particle.destroy()
      });
    }

    spawnSmallBurst(x, y, color) {
      const burstColor = color || STAGE_COLORS.soul;
      for (let i = 0; i < 5; i += 1) this.spawnSoulParticle(x, y);
      const ring = this.add.circle(x, y, 15, burstColor, 0).setStrokeStyle(4, burstColor, 0.72);
      this.layers.effects.add(ring);
      this.tweens.add({
        targets: ring,
        scale: 4.2,
        alpha: 0,
        duration: 430,
        ease: 'Sine.easeOut',
        onComplete: () => ring.destroy()
      });
    }
  };
}
