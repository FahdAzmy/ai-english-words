export interface STTResult {
  transcript: string;
  confidence: number; // 0 to 1
  isFinal: boolean;
}

export type STTCallback = (result: STTResult) => void;

export interface STTService {
  isAvailable(): boolean;
  startListening(callback: STTCallback): void;
  stopListening(): void;
  getProvider(): string;
}

type SpeechRecognitionType = typeof window extends object
  ? typeof window extends { SpeechRecognition: infer T }
    ? T
    : typeof window extends { webkitSpeechRecognition: infer T }
      ? T
      : never
  : never;

class BrowserSTTService implements STTService {
  private recognition: any = null;
  private callback: STTCallback | null = null;
  private provider: string = 'none';

  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  startListening(callback: STTCallback): void {
    if (!this.isAvailable()) {
      console.warn('Speech-to-text is not available in this browser.');
      return;
    }

    this.callback = callback;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.provider = 'browser';

    this.recognition.onresult = (event: any) => {
      let transcript = '';
      let confidence = 0;
      let isFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          transcript += result[0].transcript;
          confidence = result[0].confidence;
          isFinal = true;
        } else {
          transcript += result[0].transcript;
        }
      }

      if (this.callback) {
        this.callback({ transcript, confidence, isFinal });
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    this.recognition.start();
  }

  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
      this.callback = null;
      this.provider = 'none';
    }
  }

  getProvider(): string {
    return this.provider;
  }
}

export const speechToTextService: STTService = new BrowserSTTService();
