import { createUnboxyGame } from '@unboxy/phaser-sdk';
import BoardPlugin from 'phaser3-rex-plugins/plugins/board-plugin.js';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { GAME_WIDTH, GAME_HEIGHT } from './config';

createUnboxyGame({
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scenes: [BootScene, GameScene, UIScene],
  plugins: {
    scene: [
      { key: 'rexBoard', plugin: BoardPlugin, mapping: 'rexBoard' },
    ],
  },
});
