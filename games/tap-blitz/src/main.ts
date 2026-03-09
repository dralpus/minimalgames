import Phaser from 'phaser';
import { GameEngine } from '@core';
import { GAME_CONFIG, GAME_WIDTH, GAME_HEIGHT } from './config';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

async function bootstrap(): Promise<void> {
  const engine = new GameEngine(GAME_CONFIG);

  engine.achievements.register([
    { id: 'score_500',   name: 'Quick Tapper',   description: 'Score 500 points' },
    { id: 'score_2000',  name: 'Blitz Master',   description: 'Score 2,000 points' },
    { id: 'streak_5',    name: 'On Fire',         description: 'Reach a 5 tap streak' },
    { id: 'streak_10',   name: 'Unstoppable',     description: 'Reach a 10 tap streak' },
    { id: 'streak_20',   name: 'Legendary',       description: 'Reach a 20 tap streak' },
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
    backgroundColor: '#1a1a2e',
    parent: 'game-container',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    scene: [MenuScene, GameScene, GameOverScene],
    input: { activePointers: 3 },
    render: { antialias: true },
  };

  const game = new Phaser.Game(phaserConfig);

  game.events.once('ready', () => {
    game.scene.start('MenuScene', { engine });
  });

  window.addEventListener('resize', () => game.scale.refresh());
}

bootstrap().catch(console.error);
