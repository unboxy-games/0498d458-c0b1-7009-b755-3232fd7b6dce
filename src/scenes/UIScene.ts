import Phaser from 'phaser';

/**
 * UIScene — minimal overlay; all HUD is rendered in GameScene's right panel.
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    // HUD is managed directly by GameScene's right-side panel.
    // UIScene kept for platform compatibility.
  }
}
