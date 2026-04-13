/**
 * Speech-to-Text Service Tests (TDD: RED phase)
 * These tests should FAIL initially, then pass after implementation
 */
import { speechToTextService, type STTService } from '@/lib/services/speech-to-text';

describe('SpeechToTextService', () => {
  let service: STTService;

  beforeEach(() => {
    service = speechToTextService;
  });

  describe('availability', () => {
    it('should detect if STT is available', () => {
      const available = service.isAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('startListening', () => {
    it('should start listening when STT is available', () => {
      if (!service.isAvailable()) {
        return;
      }
      const callback = jest.fn();
      expect(() => service.startListening(callback)).not.toThrow();
    });
  });

  describe('stopListening', () => {
    it('should stop listening', () => {
      if (!service.isAvailable()) {
        return;
      }
      expect(() => service.stopListening()).not.toThrow();
    });
  });

  describe('getProvider', () => {
    it('should return the current provider name', () => {
      const provider = service.getProvider();
      expect(typeof provider).toBe('string');
    });
  });
});
