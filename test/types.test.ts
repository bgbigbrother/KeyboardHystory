// Test for TypeScript interfaces defined in task 2.1
import { KeyEvent, RecordingSession, KeyboardHistoryConfig } from '../src/types';

describe('TypeScript Interfaces', () => {
  test('KeyEvent interface can be used to create valid objects', () => {
    const keyEvent: KeyEvent = {
      key: 'a',
      duration: 150,
      timestamp: Date.now(),
      code: 'KeyA'
    };

    expect(keyEvent.key).toBe('a');
    expect(keyEvent.duration).toBe(150);
    expect(typeof keyEvent.timestamp).toBe('number');
    expect(keyEvent.code).toBe('KeyA');
  });

  test('RecordingSession interface can be used to create valid objects', () => {
    const session: RecordingSession = {
      isRecording: false,
      startTime: null,
      events: []
    };

    expect(session.isRecording).toBe(false);
    expect(session.startTime).toBeNull();
    expect(Array.isArray(session.events)).toBe(true);
    expect(session.events.length).toBe(0);
  });

  test('KeyboardHistoryConfig interface can be used with optional properties', () => {
    const config1: KeyboardHistoryConfig = {};
    expect(config1).toBeDefined();

    const config2: KeyboardHistoryConfig = {
      maxEvents: 5000,
      captureRepeats: false,
      timestampPrecision: 2
    };

    expect(config2.maxEvents).toBe(5000);
    expect(config2.captureRepeats).toBe(false);
    expect(config2.timestampPrecision).toBe(2);
  });

  test('KeyEvent interface enforces correct types', () => {
    const keyEvent: KeyEvent = {
      key: 'Enter',
      duration: 75.5,
      timestamp: 1640995200000,
      code: 'Enter'
    };

    expect(typeof keyEvent.key).toBe('string');
    expect(typeof keyEvent.duration).toBe('number');
    expect(typeof keyEvent.timestamp).toBe('number');
    expect(typeof keyEvent.code).toBe('string');
  });
});