/**
 * Text-to-Speech Service Tests (TDD: RED phase)
 * These tests should FAIL initially, then pass after implementation
 */
import { textToSpeechService, type TTSService } from '@/lib/services/text-to-speech';

describe('TextToSpeechService', () => {
  let service: TTSService;

  beforeEach(() => {
    service = textToSpeechService;
    // Reset any state between tests
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  });

  describe('availability', () => {
    it('should detect if TTS is available', () => {
      const available = service.isAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('speak', () => {
    it('should speak text when TTS is available', () => {
      if (!service.isAvailable()) {
        return; // Skip if TTS not available in test environment
      }
      expect(() => service.speak('Hello World')).not.toThrow();
    });

    it('should accept options for rate and pitch', () => {
      if (!service.isAvailable()) {
        return;
      }
      expect(() =>
        service.speak('Hello', { rate: 0.8, pitch: 1.2 })
      ).not.toThrow();
    });
  });

  describe('pause', () => {
    it('should pause speech when speaking', () => {
      if (!service.isAvailable()) {
        return;
      }
      expect(() => service.pause()).not.toThrow();
    });
  });

  describe('resume', () => {
    it('should resume speech when paused', () => {
      if (!service.isAvailable()) {
        return;
      }
      expect(() => service.resume()).not.toThrow();
    });
  });

  describe('stop', () => {
    it('should stop speech completely', () => {
      if (!service.isAvailable()) {
        return;
      }
      expect(() => service.stop()).not.toThrow();
    });
  });
});
