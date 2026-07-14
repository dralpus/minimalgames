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
    { id: 'hops_10',    name: 'First Steps',   description: 'Complete 10 hops' },
    { id: 'hops_25',    name: 'Orbit Runner',  description: 'Complete 25 hops' },
    { id: 'hops_50',    name: 'Star Voyager',  description: 'Complete 50 hops' },
    { id: 'perfect_5',  name: 'Sharpshooter',  description: 'Land 5 perfect latches in one run' },
    { id: 'perfect_15', name: 'Sniper',        description: 'Land 15 perfect latches in one run' },
    { id: 'combo_x5',   name: 'Combo Master',  description: 'Reach a combo of x5' },
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
    backgroundColor: '#0a0e1a',
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

  // Store engine on registry so BootScene can pass it to MenuScene
  game.registry.set('engine', engine);

  // Resize handler
  window.addEventListener('resize', () => {
    game.scale.refresh();
  });
}

bootstrap().catch(console.error);
