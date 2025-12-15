import { KeyboardHistory } from '../src/KeyboardHistory';
import { KeyEvent } from '../src/types';

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow
  }
});

// Mock document event listeners
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
Object.defineProperty(global, 'document', {
  value: {
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener
  }
});

describe('KeyboardHistory', () => {
  let keyboardHistory: KeyboardHistory;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
    keyboardHistory = new KeyboardHistory();
  });

  describe('Constructor', () => {
    it('should create a KeyboardHistory instance', () => {
      expect(keyboardHistory).toBeInstanceOf(KeyboardHistory);
    });

    it('should create instance with configuration', () => {
      const config = { maxEvents: 5000, captureRepeats: false };
      const instance = new KeyboardHistory(config);
      expect(instance).toBeInstanceOf(KeyboardHistory);
    });
  });

  describe('Session Management', () => {
    it('should start recording session', () => {
      expect(keyboardHistory.isRecording()).toBe(false);
      
      keyboardHistory.start();
      
      expect(keyboardHistory.isRecording()).toBe(true);
      expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      expect(mockAddEventListener).toHaveBeenCalledWith('keyup', expect.any(Function), true);
    });

    it('should stop recording session', () => {
      keyboardHistory.start();
      expect(keyboardHistory.isRecording()).toBe(true);
      
      keyboardHistory.stop();
      
      expect(keyboardHistory.isRecording()).toBe(false);
      expect(mockRemoveEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      expect(mockRemoveEventListener).toHaveBeenCalledWith('keyup', expect.any(Function), true);
    });

    it('should handle stop() called before start() gracefully', () => {
      expect(keyboardHistory.isRecording()).toBe(false);
      
      // Should not throw error
      expect(() => keyboardHistory.stop()).not.toThrow();
      expect(keyboardHistory.isRecording()).toBe(false);
    });

    it('should handle multiple start() calls gracefully', () => {
      keyboardHistory.start();
      expect(keyboardHistory.isRecording()).toBe(true);
      
      // Second start should maintain recording state
      keyboardHistory.start();
      expect(keyboardHistory.isRecording()).toBe(true);
    });
  });

  describe('Data Retrieval', () => {
    it('should return empty array when no events recorded', () => {
      const events = keyboardHistory.getRecordedKeys();
      expect(events).toEqual([]);
      expect(Array.isArray(events)).toBe(true);
    });

    it('should return session information', () => {
      const session = keyboardHistory.getSession();
      expect(session).toHaveProperty('isRecording', false);
      expect(session).toHaveProperty('startTime', null);
      expect(session).toHaveProperty('events');
      expect(Array.isArray(session.events)).toBe(true);
    });
  });
});