import Phaser from 'phaser';
import { GameEngine } from '@core';
import { GAME_CONFIG, GAME_WIDTH, GAME_HEIGHT } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

async function bootstrap(): Promise<void> {
  // Register achievements
  const engine = new GameEngine(GAME_CONFIG);
  engine.achievements.register([
    { id: 'score_100',   name: 'Getting Started',  description: 'Score 100 points' },
    { id: 'score_500',   name: 'Neon Veteran',      description: 'Score 500 points' },
    { id: 'score_1000',  name: 'Dodger Pro',        description: 'Score 1,000 points' },
    { id: 'score_5000',  name: 'Neon Legend',       description: 'Score 5,000 points' },
    { id: 'diff_3',      name: 'Speed Demon',       description: 'Reach difficulty 3' },
    { id: 'diff_5',      name: 'Untouchable',       description: 'Reach difficulty 5' },
  ]);

  // Init Firebase in the background so Phaser starts immediately
  engine.init()
    .then(() => engine.auth.getCurrentUser() || engine.auth.loginAnonymously())
    .catch(() => {});

  // Show banner ad
  if (GAME_CONFIG.adsEnabled) {
    engine.ads.showBanner('bottom');
  }

  // Calculate game dimensions (fit to screen)
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  const scale = Math.min(maxW / GAME_WIDTH, maxH / GAME_HEIGHT);
  const gameW = Math.floor(GAME_WIDTH * scale);
  const gameH = Math.floor(GAME_HEIGHT * scale);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#000011',
    parent: 'game-container',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    scene: [BootScene, MenuScene, GameScene, GameOverScene],
    render: {
      antialias: true,
      pixelArt: false,
    },
    input: {
      activePointers: 3,
    },
  };

  const game = new Phaser.Game(config);

  // Pass engine to initial scene via registry
  game.events.once('ready', () => {
    game.scene.start('MenuScene', { engine });
    // Stop BootScene from competing
    game.scene.stop('BootScene');
  });

  // Resize handler
  window.addEventListener('resize', () => {
    game.scale.refresh();
  });
}

bootstrap().catch(console.error);
