import Phaser from 'phaser';
import Bejeweled from 'phaser3-rex-plugins/templates/bejeweled/Bejeweled.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

declare module 'phaser' {
  namespace Phaser {
    interface Scene {
      rexBoard: any;
    }
  }
}

// ─── Level definitions ───────────────────────────────────────────────────────
const LEVELS = [
  { target: 15, moves: 20 },
  { target: 25, moves: 22 },
  { target: 40, moves: 25 },
  { target: 55, moves: 28 },
  { target: 75, moves: 30 },
];

// ─── Candy palette ───────────────────────────────────────────────────────────
const CANDY_COLORS: Record<string, { base: number; dark: number; light: number }> = {
  A: { base: 0xe84040, dark: 0xa02020, light: 0xff8888 }, // red
  B: { base: 0x3a8aff, dark: 0x1c4eaa, light: 0x88bbff }, // blue
  C: { base: 0x33cc55, dark: 0x1a7733, light: 0x88ffaa }, // green
  D: { base: 0xffcc00, dark: 0xaa8800, light: 0xffee88 }, // yellow
  E: { base: 0xcc44ee, dark: 0x8822aa, light: 0xee99ff }, // purple
  F: { base: 0xff8822, dark: 0xaa4400, light: 0xffcc88 }, // orange
};

const CELL = 60;
const COLS = 8;
const ROWS = 8;
const BOARD_X = 80;
const BOARD_Y = (GAME_HEIGHT - ROWS * CELL) / 2;

export class GameScene extends Phaser.Scene {
  private bejeweled!: any;
  private score = 0;
  private movesLeft = 0;
  private cleared = 0;
  private levelIndex = 0;

  // UI refs inside GameScene (depth 10+)
  private scoreVal!: Phaser.GameObjects.Text;
  private movesVal!: Phaser.GameObjects.Text;
  private clearedVal!: Phaser.GameObjects.Text;
  private levelVal!: Phaser.GameObjects.Text;
  private overlayGroup!: Phaser.GameObjects.Group;

  // selection highlight
  private selectRing!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'GameScene' });
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private get currentLevel() {
    return LEVELS[Math.min(this.levelIndex, LEVELS.length - 1)];
  }

  // ─── create ────────────────────────────────────────────────────────────────

  create(): void {
    this.score = 0;
    this.cleared = 0;
    this.movesLeft = this.currentLevel.moves;

    this.buildBackground();
    this.buildRightPanel();
    this.buildBoardFrame();

    // Selection ring (drawn on top of gems, hidden by default)
    this.selectRing = this.add.graphics().setDepth(5);

    this.buildBejeweled();
    this.overlayGroup = this.add.group();

    this.scene.launch('UIScene');
  }

  // ─── background ────────────────────────────────────────────────────────────

  private buildBackground(): void {
    // Deep purple → indigo gradient via two rects + tween won't loop; just draw layered rects
    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0x1a0533, 0x1a0533, 0x0d1a66, 0x0d1a66, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Scattered candy sparkle dots
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const r = Phaser.Math.Between(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.6);
      bg.fillStyle(0xffffff, alpha);
      bg.fillCircle(x, y, r);
    }
  }

  // ─── right-side stats panel ────────────────────────────────────────────────

  private buildRightPanel(): void {
    const panelX = BOARD_X + COLS * CELL + 60;
    const panelW = GAME_WIDTH - panelX - 40;
    const panelH = ROWS * CELL;
    const panelY = BOARD_Y;

    const panel = this.add.graphics().setDepth(2);
    panel.fillStyle(0x2a0a4a, 0.85);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 18);
    panel.lineStyle(2, 0x8844cc, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 18);

    const cx = panelX + panelW / 2;
    const style = { fontFamily: 'Arial', color: '#ffffff' };

    // Title
    this.add.text(cx, panelY + 36, '🍬 CANDY\nMATCH', {
      ...style,
      fontSize: '24px',
      fontStyle: 'bold',
      align: 'center',
      color: '#ffdd55',
    }).setOrigin(0.5, 0).setDepth(3);

    // Level
    this.add.text(cx, panelY + 120, 'LEVEL', { ...style, fontSize: '14px', color: '#cc99ff' }).setOrigin(0.5).setDepth(3);
    this.levelVal = this.add.text(cx, panelY + 148, `${this.levelIndex + 1}`, {
      ...style, fontSize: '36px', fontStyle: 'bold', color: '#ffdd55',
    }).setOrigin(0.5).setDepth(3);

    this.buildSeparator(panelX + 20, panelY + 175, panelW - 40);

    // Cleared / target
    this.add.text(cx, panelY + 200, 'CLEARED', { ...style, fontSize: '13px', color: '#cc99ff' }).setOrigin(0.5).setDepth(3);
    this.clearedVal = this.add.text(cx, panelY + 225, `0 / ${this.currentLevel.target}`, {
      ...style, fontSize: '22px', fontStyle: 'bold', color: '#88ffaa',
    }).setOrigin(0.5).setDepth(3);

    this.buildSeparator(panelX + 20, panelY + 260, panelW - 40);

    // Score
    this.add.text(cx, panelY + 285, 'SCORE', { ...style, fontSize: '13px', color: '#cc99ff' }).setOrigin(0.5).setDepth(3);
    this.scoreVal = this.add.text(cx, panelY + 308, '0', {
      ...style, fontSize: '26px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(3);

    this.buildSeparator(panelX + 20, panelY + 345, panelW - 40);

    // Moves left
    this.add.text(cx, panelY + 368, 'MOVES LEFT', { ...style, fontSize: '13px', color: '#cc99ff' }).setOrigin(0.5).setDepth(3);
    this.movesVal = this.add.text(cx, panelY + 394, `${this.movesLeft}`, {
      ...style, fontSize: '40px', fontStyle: 'bold', color: '#ff9944',
    }).setOrigin(0.5).setDepth(3);

    // Instructions
    this.add.text(cx, panelY + panelH - 30, 'Swap adjacent gems\nto match 3 or more!', {
      ...style, fontSize: '12px', align: 'center', color: '#9966cc',
    }).setOrigin(0.5).setDepth(3);
  }

  private buildSeparator(x: number, y: number, w: number): void {
    const g = this.add.graphics().setDepth(3);
    g.lineStyle(1, 0x8844cc, 0.5);
    g.lineBetween(x, y, x + w, y);
  }

  // ─── board frame ──────────────────────────────────────────────────────────

  private buildBoardFrame(): void {
    const pad = 6;
    const frame = this.add.graphics().setDepth(1);
    frame.fillStyle(0x2a0a4a, 0.9);
    frame.fillRoundedRect(BOARD_X - pad, BOARD_Y - pad, COLS * CELL + pad * 2, ROWS * CELL + pad * 2, 12);
    frame.lineStyle(3, 0xaa66ff, 1);
    frame.strokeRoundedRect(BOARD_X - pad, BOARD_Y - pad, COLS * CELL + pad * 2, ROWS * CELL + pad * 2, 12);

    // Cell grid lines (subtle)
    frame.lineStyle(1, 0x6633aa, 0.3);
    for (let c = 1; c < COLS; c++) {
      frame.lineBetween(BOARD_X + c * CELL, BOARD_Y, BOARD_X + c * CELL, BOARD_Y + ROWS * CELL);
    }
    for (let r = 1; r < ROWS; r++) {
      frame.lineBetween(BOARD_X, BOARD_Y + r * CELL, BOARD_X + COLS * CELL, BOARD_Y + r * CELL);
    }
  }

  // ─── Bejeweled engine ──────────────────────────────────────────────────────

  private buildBejeweled(): void {
    this.bejeweled = new Bejeweled(this, {
      board: {
        x: BOARD_X,
        y: BOARD_Y,
        width: COLS,
        height: ROWS,
        cellWidth: CELL,
        cellHeight: CELL,
      },
      chess: {
        symbols: ['A', 'B', 'C', 'D', 'E', 'F'],
        create: (_board: any) => this.createGem(),
        moveTo: { speed: 500 },
      },
      match: {},
      input: true,
    });

    this.bejeweled.start();

    // Events
    this.bejeweled.on('match', (lines: Set<Phaser.GameObjects.GameObject>[]) => {
      this.onMatch(lines);
    });

    this.bejeweled.on('eliminate', (gems: Phaser.GameObjects.GameObject[]) => {
      this.onEliminate(gems);
    });

    this.bejeweled.on('select1', (chess: any) => {
      this.drawSelectRing(chess, 0xffdd44, 3);
    });

    this.bejeweled.on('select2', (chess: any) => {
      this.drawSelectRing(chess, 0xffffff, 2);
    });
  }

  // ─── gem drawing ──────────────────────────────────────────────────────────

  private createGem(): Phaser.GameObjects.Graphics {
    const g = this.add.graphics().setDepth(2);

    g.on('changedata-symbol', (_obj: any, symbol: string) => {
      this.drawCandy(g, symbol);
    });

    return g;
  }

  private drawCandy(g: Phaser.GameObjects.Graphics, symbol: string): void {
    const pal = CANDY_COLORS[symbol] ?? { base: 0xffffff, dark: 0x999999, light: 0xffffff };
    const r = 22;

    g.clear();

    // Drop shadow
    g.fillStyle(0x000000, 0.22);
    g.fillRoundedRect(-r + 3, -r + 5, r * 2 - 2, r * 2 - 2, 9);

    // Base shape
    g.fillStyle(pal.dark, 1);
    g.fillRoundedRect(-r, -r, r * 2, r * 2, 9);

    // Main candy face (slightly inset)
    g.fillStyle(pal.base, 1);
    g.fillRoundedRect(-r + 2, -r + 2, r * 2 - 4, r * 2 - 4, 8);

    // Glossy highlight — top-left ellipse
    g.fillStyle(0xffffff, 0.40);
    g.fillEllipse(-6, -10, 18, 10);

    // Tiny sparkle dot
    g.fillStyle(0xffffff, 0.70);
    g.fillCircle(-10, -12, 3);
  }

  // ─── selection ring ───────────────────────────────────────────────────────

  private drawSelectRing(chess: any, color: number, lineW: number): void {
    if (!chess) {
      this.selectRing.clear();
      return;
    }
    const x = chess.x ?? 0;
    const y = chess.y ?? 0;
    this.selectRing.clear();
    this.selectRing.lineStyle(lineW + 1, 0x000000, 0.4);
    this.selectRing.strokeRoundedRect(x - 24, y - 24, 48, 48, 10);
    this.selectRing.lineStyle(lineW, color, 1);
    this.selectRing.strokeRoundedRect(x - 24, y - 24, 48, 48, 10);
  }

  // ─── match / eliminate events ─────────────────────────────────────────────

  private onMatch(lines: Set<Phaser.GameObjects.GameObject>[]): void {
    let gemsCleared = 0;
    for (const line of lines) gemsCleared += line.size;

    // Bonus for longer chains
    const bonus = lines.reduce((acc, l) => acc + (l.size > 3 ? (l.size - 3) * 15 : 0), 0);
    const points = gemsCleared * 10 + bonus;
    this.score += points;
    this.cleared += gemsCleared;

    this.scoreVal.setText(`${this.score}`);
    this.clearedVal.setText(`${this.cleared} / ${this.currentLevel.target}`);

    // Animate score bump
    this.tweens.add({ targets: this.scoreVal, scaleX: 1.3, scaleY: 1.3, duration: 80, yoyo: true, ease: 'Sine.easeOut' });

    // Count the move
    this.movesLeft--;
    this.movesVal.setText(`${Math.max(0, this.movesLeft)}`);
    if (this.movesLeft <= 5) this.movesVal.setStyle({ color: '#ff4444', fontSize: '40px', fontStyle: 'bold' });

    // Check win/lose
    if (this.cleared >= this.currentLevel.target) {
      this.time.delayedCall(600, () => this.showLevelComplete());
    } else if (this.movesLeft <= 0) {
      this.time.delayedCall(600, () => this.showGameOver());
    }

    this.selectRing.clear();
  }

  private onEliminate(gems: Phaser.GameObjects.GameObject[]): void {
    for (const gem of gems) {
      const x = (gem as any).x ?? 0;
      const y = (gem as any).y ?? 0;
      this.spawnPop(x, y);
    }
  }

  // ─── particle pop ─────────────────────────────────────────────────────────

  private spawnPop(x: number, y: number): void {
    const colors = [0xffdd44, 0xff88cc, 0x88eeff, 0xaaffaa, 0xff8844];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = Phaser.Math.Between(40, 110);
      const dot = this.add.graphics().setDepth(4);
      const color = colors[i % colors.length];
      dot.fillStyle(color, 1);
      dot.fillCircle(0, 0, Phaser.Math.Between(3, 6));
      dot.setPosition(x, y);

      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: Phaser.Math.Between(300, 600),
        ease: 'Quad.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  // ─── overlays ─────────────────────────────────────────────────────────────

  private clearOverlay(): void {
    this.overlayGroup.clear(true, true);
  }

  private showLevelComplete(): void {
    this.clearOverlay();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const bg = this.add.graphics().setDepth(1000);
    bg.fillStyle(0x000000, 0.65);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlayGroup.add(bg);

    const panel = this.add.graphics().setDepth(1001);
    panel.fillStyle(0x1a0533, 1);
    panel.fillRoundedRect(cx - 220, cy - 160, 440, 320, 20);
    panel.lineStyle(3, 0xffdd44, 1);
    panel.strokeRoundedRect(cx - 220, cy - 160, 440, 320, 20);
    this.overlayGroup.add(panel);

    const title = this.add.text(cx, cy - 100, '🎉 LEVEL COMPLETE!', {
      fontFamily: 'Arial', fontSize: '32px', fontStyle: 'bold', color: '#ffdd44',
    }).setOrigin(0.5).setDepth(1002).setAlpha(0);
    this.overlayGroup.add(title);

    const scoreMsg = this.add.text(cx, cy - 30, `Score: ${this.score}`, {
      fontFamily: 'Arial', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(1002).setAlpha(0);
    this.overlayGroup.add(scoreMsg);

    const isLast = this.levelIndex >= LEVELS.length - 1;
    const nextLabel = isLast ? 'YOU WIN! Play Again' : 'Next Level →';

    const btn = this.add.graphics().setDepth(1002);
    btn.fillStyle(0x8844cc, 1);
    btn.fillRoundedRect(cx - 110, cy + 60, 220, 54, 14);
    btn.lineStyle(2, 0xcc99ff, 1);
    btn.strokeRoundedRect(cx - 110, cy + 60, 220, 54, 14);
    this.overlayGroup.add(btn);

    const btnText = this.add.text(cx, cy + 87, nextLabel, {
      fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(1003).setAlpha(0);
    this.overlayGroup.add(btnText);

    // Fade in
    this.tweens.add({ targets: [title, scoreMsg, btnText], alpha: 1, duration: 400, ease: 'Sine.easeIn' });

    // Button hitzone
    const zone = this.add.zone(cx, cy + 87, 220, 54).setInteractive({ cursor: 'pointer' }).setDepth(1004);
    this.overlayGroup.add(zone);

    zone.on('pointerover', () => { btn.clear(); btn.fillStyle(0xaa66ff, 1); btn.fillRoundedRect(cx - 110, cy + 60, 220, 54, 14); });
    zone.on('pointerout', () => { btn.clear(); btn.fillStyle(0x8844cc, 1); btn.fillRoundedRect(cx - 110, cy + 60, 220, 54, 14); });
    zone.on('pointerdown', () => {
      if (!isLast) this.levelIndex++;
      this.restartGame();
    });
  }

  private showGameOver(): void {
    this.clearOverlay();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const bg = this.add.graphics().setDepth(1000);
    bg.fillStyle(0x000000, 0.65);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlayGroup.add(bg);

    const panel = this.add.graphics().setDepth(1001);
    panel.fillStyle(0x1a0533, 1);
    panel.fillRoundedRect(cx - 220, cy - 160, 440, 320, 20);
    panel.lineStyle(3, 0xff4444, 1);
    panel.strokeRoundedRect(cx - 220, cy - 160, 440, 320, 20);
    this.overlayGroup.add(panel);

    const title = this.add.text(cx, cy - 100, '💔 OUT OF MOVES!', {
      fontFamily: 'Arial', fontSize: '30px', fontStyle: 'bold', color: '#ff6666',
    }).setOrigin(0.5).setDepth(1002).setAlpha(0);
    this.overlayGroup.add(title);

    const progress = this.add.text(cx, cy - 45, `Cleared: ${this.cleared} / ${this.currentLevel.target}`, {
      fontFamily: 'Arial', fontSize: '18px', color: '#dddddd',
    }).setOrigin(0.5).setDepth(1002).setAlpha(0);
    this.overlayGroup.add(progress);

    const scoreMsg = this.add.text(cx, cy, `Score: ${this.score}`, {
      fontFamily: 'Arial', fontSize: '20px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(1002).setAlpha(0);
    this.overlayGroup.add(scoreMsg);

    const btn = this.add.graphics().setDepth(1002);
    btn.fillStyle(0xcc3333, 1);
    btn.fillRoundedRect(cx - 110, cy + 60, 220, 54, 14);
    btn.lineStyle(2, 0xff9999, 1);
    btn.strokeRoundedRect(cx - 110, cy + 60, 220, 54, 14);
    this.overlayGroup.add(btn);

    const btnText = this.add.text(cx, cy + 87, 'Try Again ↺', {
      fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(1003).setAlpha(0);
    this.overlayGroup.add(btnText);

    this.tweens.add({ targets: [title, progress, scoreMsg, btnText], alpha: 1, duration: 400, ease: 'Sine.easeIn' });

    const zone = this.add.zone(cx, cy + 87, 220, 54).setInteractive({ cursor: 'pointer' }).setDepth(1004);
    this.overlayGroup.add(zone);
    zone.on('pointerover', () => { btn.clear(); btn.fillStyle(0xee5555, 1); btn.fillRoundedRect(cx - 110, cy + 60, 220, 54, 14); });
    zone.on('pointerout', () => { btn.clear(); btn.fillStyle(0xcc3333, 1); btn.fillRoundedRect(cx - 110, cy + 60, 220, 54, 14); });
    zone.on('pointerdown', () => this.restartGame());
  }

  // ─── restart ──────────────────────────────────────────────────────────────

  private restartGame(): void {
    this.scene.stop('UIScene');
    this.scene.restart();
  }

  update(_time: number, _delta: number): void {}
}
