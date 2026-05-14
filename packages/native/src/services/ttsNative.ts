import { localeByLang, type SpeechOptions } from '@roam/shared';
import { Audio, InterruptionModeIOS } from 'expo-av';
import * as ExpoSpeech from 'expo-speech';
import { Platform } from 'react-native';
import type { SpeechStatus } from './speechService';

export interface TTSConfigs extends SpeechOptions {
  lang?: string;
}

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  quality: string;
}

export class TTSNative {
  private status: SpeechStatus = 'idle';
  private wordTimer: ReturnType<typeof setInterval> | null = null;
  private stopped: boolean = false;

  constructor() {
    // Ensure iOS audio session is set to playback (ignore silent switch)
    this.configureAudioSession();
  }

  speak(text: string, configs: TTSConfigs = {}, onEnd?: () => void, onError?: () => void, onBoundary?: (charIndex: number, charLength: number) => void): void {
    // Cancel any ongoing speech
    this.stop();
    this.stopped = false;

    // Apply configs
    const options: ExpoSpeech.SpeechOptions = {
      language: configs.lang ?? localeByLang['default'],
      rate: configs.rate ?? 1.0,
      pitch: configs.pitch ?? 1.0,
      volume: configs.volume ?? 1.0,
      onStart: () => {
        this.status = 'speaking';
        if (onBoundary) this.startWordSimulation(text, configs.rate ?? 1.0, onBoundary);
      },
      onDone: () => {
        this.cleanup();
        if (!this.stopped) onEnd?.();
      },
      onError: () => {
        this.cleanup();
        if (!this.stopped) onError?.();
      },
      onStopped: () => {
        this.cleanup();
      },
    };

    if (configs.voice && configs.voice !== 'system-default') {
      options.voice = configs.voice;
    }

    try {
      ExpoSpeech.speak(text, options);
    } catch (error) {
      console.error('❌ Failed to start TTS speech:', error);
      this.status = 'idle';
      this.cleanup();
      onError?.();
    }
  }

  pause(): void {
    if (this.status === 'speaking') {
      ExpoSpeech.pause();
      this.status = 'paused';
      this.clearWordTimer();
    }
  }

  resume(): void {
    if (this.status === 'paused') {
      ExpoSpeech.resume();
      this.status = 'speaking';
    }
  }

  stop(): void {
    this.stopped = true;
    this.clearWordTimer();
    ExpoSpeech.stop();
    this.status = 'idle';
  }

  getStatus(): SpeechStatus {
    return this.status;
  }

  async getVoices(configs: TTSConfigs): Promise<TTSVoice[]> {
    const lang = configs.lang ?? localeByLang['default'];
    const prefix = lang.split('-')[0];

    const voices = await ExpoSpeech.getAvailableVoicesAsync();
    const foundVoices: TTSVoice[] = voices
      .filter((v) => v.language.startsWith(prefix))
      .map(({ identifier, name, language, quality }) => ({
        id: identifier,
        name,
        language,
        quality: quality ?? 'default',
      }));
    return foundVoices;
  }

  async getVoice(configs: TTSConfigs): Promise<TTSVoice | null> {
    const foundVoices = await this.getVoices(configs);
    const defaultVoice = foundVoices[0] || null;
    if (!configs.voice) return defaultVoice;

    const found = foundVoices.find((v) => v.name === configs.voice);
    return found || defaultVoice;
  }

  private startWordSimulation(text: string, rate: number, onBoundary: (charIndex: number, charLength: number) => void) {
    this.clearWordTimer();

    const words = this.tokenize(text);
    if (words.length === 0) return;

    // Estimate ~200 wpm at rate=1.0 => ~300ms per word
    const msPerWord = Math.max(80, 300 / rate);
    let wordIdx = 0;

    this.wordTimer = setInterval(() => {
      if (wordIdx >= words.length || this.status !== 'speaking') {
        this.clearWordTimer();
        return;
      }
      const { index, length } = words[wordIdx];
      onBoundary(index, length);
      wordIdx++;
    }, msPerWord);
  }

  private clearWordTimer() {
    if (!this.wordTimer) return;
    clearInterval(this.wordTimer);
    this.wordTimer = null;
  }

  private cleanup() {
    this.clearWordTimer();
    this.status = 'idle';
  }

  private configureAudioSession() {
    if (Platform.OS !== 'ios') return;
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      staysActiveInBackground: true,
    }).catch((e) => console.warn('⚠️ Failed to set audio session:', e));
  }

  private tokenize(text: string) {
    const tokens: { index: number; length: number }[] = [];
    const regex = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      tokens.push({ index: match.index, length: match[0].length });
    }
    return tokens;
  }

  setRate(rate: number): void {
    // if (this.utterance) this.utterance.rate = rate;
  }

  setPitch(pitch: number): void {
    // // if (this.utterance) this.utterance.pitch = pitch;
  }

  setVolume(volume: number): void {
    // // if (this.utterance) this.utterance.volume = volume;
  }
}
