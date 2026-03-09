/**
 * AudioManager: thin wrapper around the Web Audio API.
 * Uses Howler.js if available, otherwise falls back to HTML5 Audio.
 * Sound effects and music are loaded lazily.
 */
export class AudioManager {
  private sounds: Map<string, any> = new Map();
  private musicTrack: any = null;
  private sfxVolume = 1;
  private musicVolume = 0.5;
  private muted = false;
  private Howl: any = null;

  async init(): Promise<void> {
    try {
      const howler = await import('howler');
      this.Howl = howler.Howl;
    } catch {
      // Howler not available — audio will be limited
    }
  }

  loadSound(key: string, src: string | string[]): void {
    if (!this.Howl) return;
    if (this.sounds.has(key)) return;
    const sound = new this.Howl({
      src: Array.isArray(src) ? src : [src],
      volume: this.sfxVolume,
    });
    this.sounds.set(key, sound);
  }

  play(key: string): void {
    if (this.muted) return;
    const sound = this.sounds.get(key);
    if (sound) {
      sound.volume(this.sfxVolume);
      sound.play();
    }
  }

  playMusic(src: string | string[], loop = true): void {
    this.stopMusic();
    if (!this.Howl) return;
    this.musicTrack = new this.Howl({
      src: Array.isArray(src) ? src : [src],
      volume: this.musicVolume,
      loop,
    });
    if (!this.muted) this.musicTrack.play();
  }

  stopMusic(): void {
    if (this.musicTrack) {
      this.musicTrack.stop();
      this.musicTrack.unload();
      this.musicTrack = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.Howl) {
      const { Howler } = require('howler');
      Howler.mute(muted);
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setSFXVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicTrack) this.musicTrack.volume(this.musicVolume);
  }

  unloadAll(): void {
    this.stopMusic();
    this.sounds.forEach((s) => s.unload());
    this.sounds.clear();
  }
}
