export interface TTSSpeakOptions {
  rate?: number;    // 0.1 to 10, default 1
  pitch?: number;   // 0 to 2, default 1
  volume?: number;  // 0 to 1, default 1
  lang?: string;    // Language code, default 'en-US'
}

export interface TTSService {
  isAvailable(): boolean;
  speak(text: string, options?: TTSSpeakOptions): void;
  pause(): void;
  resume(): void;
  stop(): void;
}

class BrowserTTSService implements TTSService {
  private utterance: SpeechSynthesisUtterance | null = null;

  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  speak(text: string, options?: TTSSpeakOptions): void {
    if (!this.isAvailable()) {
      console.warn('Text-to-speech is not available in this browser.');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    this.utterance = new SpeechSynthesisUtterance(text);

    if (options) {
      if (options.rate !== undefined) {
        this.utterance.rate = Math.max(0.1, Math.min(10, options.rate));
      }
      if (options.pitch !== undefined) {
        this.utterance.pitch = Math.max(0, Math.min(2, options.pitch));
      }
      if (options.volume !== undefined) {
        this.utterance.volume = Math.max(0, Math.min(1, options.volume));
      }
      if (options.lang !== undefined) {
        this.utterance.lang = options.lang;
      }
    }

    window.speechSynthesis.speak(this.utterance);
  }

  pause(): void {
    if (!this.isAvailable()) return;
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (!this.isAvailable()) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  stop(): void {
    if (!this.isAvailable()) return;
    window.speechSynthesis.cancel();
    this.utterance = null;
  }
}

export const textToSpeechService: TTSService = new BrowserTTSService();
