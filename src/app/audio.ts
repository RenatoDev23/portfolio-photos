import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DataService } from './data';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private dataService = inject(DataService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private audio?: HTMLAudioElement;
  
  isPlaying = signal(false);
  isLooping = signal(true);
  currentTime = signal(0);
  duration = signal(0);
  volume = signal(0.02);
  hasSource = signal(false);
  isStalled = signal(false);
  loadError = signal<string | null>(null);

  constructor() {
    if (!this.isBrowser) return;

    this.audio = new Audio();
    this.audio.volume = this.volume();
    console.log('AudioService: Initialized with volume:', this.audio.volume);
    this.audio.loop = this.isLooping();
    
    // Sync volume signal
    effect(() => {
      if (this.audio) this.audio.volume = this.volume();
    });

    // Sync loop property
    effect(() => {
      if (this.audio) this.audio.loop = this.isLooping();
    });

    // Auto-load source from profile
    effect(() => {
      const profile = this.dataService.profile();
      const url = profile.musicUrl;
      
      if (url && url.length > 0 && this.audio) {
        // Only set src if it's actually different. 
        // For large data URLs, we might want to be careful with comparison.
        const currentSrc = this.audio.src;
        if (currentSrc !== url && !currentSrc.endsWith(url)) {
          console.log('Audio: Setting new source');
          this.audio.pause();
          this.audio.src = url;
          this.audio.load();
          this.loadError.set(null);
          this.hasSource.set(true);
        }
      } else if (this.audio) {
        if (this.audio.src) {
          console.log('Audio: Clearing source');
          this.audio.pause();
          this.audio.src = '';
          this.audio.load();
        }
        this.isPlaying.set(false);
        this.hasSource.set(false);
        this.loadError.set(null);
      }
    });

    if (this.audio) {
      this.audio.ontimeupdate = () => {
        this.currentTime.set(this.audio?.currentTime || 0);
        if (this.isStalled()) this.isStalled.set(false);
      };
      this.audio.onloadedmetadata = () => {
        if (this.audio) this.duration.set(this.audio.duration);
      };
      this.audio.oncanplay = () => {
        if (this.audio) this.duration.set(this.audio.duration);
      };
      this.audio.onplay = () => {
        this.isPlaying.set(true);
        this.isStalled.set(false);
      };
      this.audio.onpause = () => this.isPlaying.set(false);
      this.audio.onwaiting = () => {
        this.isStalled.set(true);
        // Force attempt to play if stalled for too long
        console.log('Audio: Waiting for data...');
        setTimeout(() => {
          if (this.isStalled() && this.audio && this.isPlaying()) {
            console.log('Audio: Stuck in waiting, attempting forced reload');
            const currentSrc = this.audio.src;
            this.audio.src = '';
            this.audio.load();
            this.audio.src = currentSrc;
            this.audio.play().catch(e => console.error('Audio: Forced play failed', e));
          }
        }, 5000);
      };
      this.audio.onstalled = () => {
        console.warn('Audio: Stalled. Attempting to recover...');
        this.isStalled.set(true);
        if (this.audio) this.audio.load(); // Try reloading on stall
      };
      this.audio.onended = () => {
        if (!this.isLooping()) this.isPlaying.set(false);
      };
      this.audio.onerror = () => {
        const error = this.audio?.error;
        let msg = 'Unknown audio error';
        if (error) {
          switch(error.code) {
            case 1: msg = 'Aborted'; break;
            case 2: msg = 'Network error'; break;
            case 3: msg = 'Decode error'; break;
            case 4: msg = 'Format not supported'; break;
          }
        }
        this.loadError.set(msg);
        console.error('Audio element error:', msg);
        this.isPlaying.set(false);
        this.hasSource.set(false);
      };
    }
  }

  pause() {
    if (this.audio) {
      this.audio.pause();
    }
  }

  toggle() {
    if (!this.audio) return;

    if (this.loadError() || this.isStalled()) {
      const url = this.dataService.profile().musicUrl;
      if (url) {
        this.setSourceAndPlay(url);
        return;
      }
    }

    if (this.isPlaying()) {
      this.audio.pause();
    } else {
      this.play();
    }
  }

  seek(time: number) {
    if (this.audio) this.audio.currentTime = time;
  }

  setVolume(vol: number) {
    this.volume.set(vol);
    if (this.audio) this.audio.volume = vol;
  }

  toggleLoop() {
    this.isLooping.update(v => !v);
  }

  setSourceAndPlay(url: string) {
    if (!this.audio) return;
    
    // Force a reset if we're stuck
    if (this.loadError() || this.isStalled()) {
      this.audio.pause();
      this.audio.src = '';
      this.audio.load();
    }

    if (this.audio.src !== url) {
      this.audio.src = url;
      this.audio.load();
    }
    
    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Playback failed/blocked:', err);
        this.isPlaying.set(false);
      });
    }
  }

  play() {
    if (this.audio) {
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Playback blocked by browser:', err);
          this.isPlaying.set(false);
        });
      }
    }
  }
}
