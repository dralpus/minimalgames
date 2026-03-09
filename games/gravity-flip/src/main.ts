import Phaser from 'phaser';
import { GameEngine } from '@core';
import { GAME_CONFIG, GAME_WIDTH, GAME_HEIGHT } from './config';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

async function bootstrap(): Promise<void> {
  const engine = new GameEngine(GAME_CONFIG);

  engine.achievements.register([
    { id: 'dist_100',   name: 'First Flight',    description: 'Run 100 meters' },
    { id: 'dist_500',   name: 'Distance Seeker', description: 'Run 500 meters' },
    { id: 'dist_1000',  name: 'Marathoner',      description: 'Run 1,000 meters' },
    { id: 'pass_10',    name: 'Obstacle Dodger', description: 'Pass 10 obstacles' },
    { id: 'pass_50',    name: 'Gravity Master',  description: 'Pass 50 obstacles' },
  ]);

  await engine.init();

  if (!engine.auth.getCurrentUser()) {
    await engine.auth.loginAnonymously().catch(() => {});
  }

  if (GAME_CONFIG.adsEnabled) {
    engine.ads.showBanner('bottom');
  }

  const phaserConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    backgroundColor: '#0d0d1a',
    parent: 'game-container',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    scene: [MenuScene, GameScene, GameOverScene],
    input: { activePointers: 2 },
    render: { antialias: true },
  };

  const game = new Phaser.Game(phaserConfig);

  game.events.once('ready', () => {
    game.scene.start('MenuScene', { engine });
  });

  window.addEventListener('resize', () => game.scale.refresh());
}

bootstrap().catch(console.error);
