import { KeyboardHistory } from '../src/KeyboardHistory';
import { KeyEvent } from '../src/types';
import * as fc from 'fast-check';

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

  describe('Configuration', () => {
    it('should pass configuration to EventReplay module', () => {
      const customEventName = 'myCustomReplayEvent';
      const configuredHistory = new KeyboardHistory({
        replayEventName: customEventName
      });
      
      expect(configuredHistory).toBeInstanceOf(KeyboardHistory);
      // The configuration is passed to EventReplay constructor
      // This test verifies the configuration is accepted without errors
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Feature: keyboard-history, Property 1: Class instantiation works correctly**
     * **Validates: Requirements 1.2**
     */
    it('should instantiate KeyboardHistory class correctly for any valid configuration', () => {
      fc.assert(
        fc.property(
          fc.option(
            fc.record({
              maxEvents: fc.option(fc.integer({ min: 1, max: 100000 })),
              captureRepeats: fc.option(fc.boolean()),
              timestampPrecision: fc.option(fc.integer({ min: 0, max: 10 })),
              replayEventName: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0))
            }, { requiredKeys: [] }),
            { nil: undefined }
          ),
          (config) => {
            // Property: KeyboardHistory should be instantiable with any valid configuration
            let instance: KeyboardHistory;
            
            try {
              instance = new KeyboardHistory(config);
            } catch (error) {
              // Should not throw for valid configurations
              return false;
            }
            
            // Property: Instance should be of correct type
            const isCorrectType = instance instanceof KeyboardHistory;
            
            // Property: Instance should have required methods
            const hasRequiredMethods = 
              typeof instance.start === 'function' &&
              typeof instance.stop === 'function' &&
              typeof instance.getRecordedKeys === 'function' &&
              typeof instance.isRecording === 'function' &&
              typeof instance.getSession === 'function' &&
              typeof instance.replay === 'function' &&
              typeof instance.stopReplay === 'function' &&
              typeof instance.isReplaying === 'function';
            
            // Property: Instance should start in non-recording state
            const startsInCorrectState = !instance.isRecording();
            
            // Property: getRecordedKeys should return empty array initially
            const initialStateCorrect = Array.isArray(instance.getRecordedKeys()) && 
                                      instance.getRecordedKeys().length === 0;
            
            // Property: getSession should return valid session object
            const session = instance.getSession();
            const sessionValid = 
              typeof session === 'object' &&
              session !== null &&
              typeof session.isRecording === 'boolean' &&
              (session.startTime === null || typeof session.startTime === 'number') &&
              Array.isArray(session.events);
            
            return isCorrectType && 
                   hasRequiredMethods && 
                   startsInCorrectState && 
                   initialStateCorrect && 
                   sessionValid;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: keyboard-history, Property 2: Session state management**
     * **Validates: Requirements 2.1, 2.2**
     */
    it('should manage session state correctly for any sequence of start/stop operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.constant('start'),
              fc.constant('stop')
            ),
            { minLength: 0, maxLength: 20 }
          ),
          (operations: string[]) => {
            const keyboardHistory = new KeyboardHistory();
            
            // Property: Initially should not be recording
            let expectedRecording = false;
            let actualRecording = keyboardHistory.isRecording();
            
            if (actualRecording !== expectedRecording) {
              return false;
            }
            
            // Apply each operation and verify state consistency
            for (const operation of operations) {
              if (operation === 'start') {
                keyboardHistory.start();
                expectedRecording = true;
              } else if (operation === 'stop') {
                keyboardHistory.stop();
                expectedRecording = false;
              }
              
              actualRecording = keyboardHistory.isRecording();
              
              // Property: Recording state should match expected state after each operation
              if (actualRecording !== expectedRecording) {
                return false;
              }
              
              // Property: Session object should be consistent with recording state
              const session = keyboardHistory.getSession();
              if (session.isRecording !== expectedRecording) {
                return false;
              }
              
              // Property: When recording, startTime should be set; when not recording, it should be null
              if (expectedRecording && session.startTime === null) {
                return false;
              }
              if (!expectedRecording && session.startTime !== null) {
                return false;
              }
              
              // Property: Events array should always be present and be an array
              if (!Array.isArray(session.events)) {
                return false;
              }
            }
            
            // Property: Final state should be consistent
            const finalSession = keyboardHistory.getSession();
            return finalSession.isRecording === expectedRecording &&
                   Array.isArray(finalSession.events) &&
                   (expectedRecording ? finalSession.startTime !== null : finalSession.startTime === null);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: keyboard-history, Property 5: Data retrieval consistency**
     * **Validates: Requirements 4.1, 4.3**
     */
    it('should maintain data retrieval consistency for any set of captured events', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              code: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              duration: fc.float({ min: 0, max: Math.fround(10000), noNaN: true }),
              timestamp: fc.float({ min: 1, max: Math.fround(1000000), noNaN: true })
            }),
            { minLength: 0, maxLength: 100 }
          ),
          (events: KeyEvent[]) => {
            const keyboardHistory = new KeyboardHistory();
            
            // Directly add events to the EventStore to simulate captured events
            // We access the private eventStore through the public API by starting recording
            keyboardHistory.start();
            
            // Add each event to the store via the EventStore's addEvent method
            // Since we can't access private members directly, we'll use the EventStore directly
            const eventStore = (keyboardHistory as any).eventStore;
            
            events.forEach(event => {
              try {
                eventStore.addEvent(event);
              } catch (error) {
                // Skip invalid events that fail validation
                return;
              }
            });
            
            keyboardHistory.stop();
            
            // Retrieve the recorded keys
            const retrievedEvents = keyboardHistory.getRecordedKeys();
            
            // Property: All retrieved events should have required properties
            const allHaveRequiredProperties = retrievedEvents.every(event => 
              typeof event.key === 'string' &&
              typeof event.code === 'string' &&
              typeof event.duration === 'number' &&
              typeof event.timestamp === 'number'
            );
            
            // Property: Retrieved events should match the valid events we added
            const validEvents = events.filter(event => {
              try {
                eventStore.validateEvent ? eventStore.validateEvent(event) : true;
                return typeof event.key === 'string' && event.key.length > 0 &&
                       typeof event.code === 'string' && event.code.length > 0 &&
                       typeof event.duration === 'number' && event.duration >= 0 &&
                       typeof event.timestamp === 'number' && event.timestamp > 0;
              } catch {
                return false;
              }
            });
            
            // Property: Number of retrieved events should match valid input events
            const countMatches = retrievedEvents.length === validEvents.length;
            
            return allHaveRequiredProperties && countMatches;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: keyboard-history, Property 11: Error handling robustness**
     * **Validates: Requirements 7.3**
     */
    it('should handle invalid method calls and edge cases gracefully without throwing unhandled exceptions', () => {
      fc.assert(
        fc.property(
          fc.record({
            // Generate various invalid configurations
            invalidConfig: fc.option(
              fc.oneof(
                fc.constant(null),
                fc.constant(undefined),
                fc.constant('invalid'),
                fc.constant(42),
                fc.constant([]),
                fc.record({
                  maxEvents: fc.oneof(
                    fc.constant(-1),
                    fc.constant(0),
                    fc.constant(Infinity),
                    fc.constant(NaN),
                    fc.constant('invalid')
                  ),
                  captureRepeats: fc.oneof(
                    fc.constant('invalid'),
                    fc.constant(42),
                    fc.constant(null)
                  ),
                  timestampPrecision: fc.oneof(
                    fc.constant(-1),
                    fc.constant(Infinity),
                    fc.constant(NaN),
                    fc.constant('invalid')
                  ),
                  replayEventName: fc.oneof(
                    fc.constant(''),
                    fc.constant(null),
                    fc.constant(42),
                    fc.constant([])
                  )
                })
              )
            ),
            // Generate sequences of method calls including invalid ones
            methodCalls: fc.array(
              fc.oneof(
                fc.constant('start'),
                fc.constant('stop'),
                fc.constant('getRecordedKeys'),
                fc.constant('isRecording'),
                fc.constant('getSession'),
                fc.constant('replay'),
                fc.constant('stopReplay'),
                fc.constant('isReplaying')
              ),
              { minLength: 0, maxLength: 20 }
            ),
            // Generate invalid events for replay testing
            invalidEvents: fc.option(
              fc.oneof(
                fc.constant(null),
                fc.constant(undefined),
                fc.constant('invalid'),
                fc.constant(42),
                fc.constant({}),
                fc.array(
                  fc.oneof(
                    fc.constant(null),
                    fc.constant(undefined),
                    fc.constant('invalid'),
                    fc.constant(42),
                    fc.record({
                      key: fc.oneof(
                        fc.constant(''),
                        fc.constant(null),
                        fc.constant(42),
                        fc.constant([])
                      ),
                      code: fc.oneof(
                        fc.constant(''),
                        fc.constant(null),
                        fc.constant(42),
                        fc.constant([])
                      ),
                      duration: fc.oneof(
                        fc.constant(-1),
                        fc.constant(Infinity),
                        fc.constant(NaN),
                        fc.constant('invalid')
                      ),
                      timestamp: fc.oneof(
                        fc.constant(0),
                        fc.constant(-1),
                        fc.constant(Infinity),
                        fc.constant(NaN),
                        fc.constant('invalid')
                      )
                    })
                  ),
                  { minLength: 0, maxLength: 10 }
                )
              )
            )
          }),
          ({ invalidConfig, methodCalls, invalidEvents }) => {
            let keyboardHistory: KeyboardHistory;
            
            // Property: Constructor should handle invalid configurations gracefully
            try {
              keyboardHistory = new KeyboardHistory(invalidConfig as any);
            } catch (error) {
              // If constructor throws, it should be a meaningful error, not an unhandled exception
              if (error instanceof Error && error.message && error.message.length > 0) {
                return true; // Graceful error handling
              }
              return false; // Unhandled or meaningless exception
            }
            
            // Property: All method calls should handle gracefully without unhandled exceptions
            for (const methodCall of methodCalls) {
              try {
                switch (methodCall) {
                  case 'start':
                    keyboardHistory.start();
                    break;
                  case 'stop':
                    keyboardHistory.stop();
                    break;
                  case 'getRecordedKeys':
                    const events = keyboardHistory.getRecordedKeys();
                    // Property: Should always return an array
                    if (!Array.isArray(events)) {
                      return false;
                    }
                    break;
                  case 'isRecording':
                    const recording = keyboardHistory.isRecording();
                    // Property: Should always return a boolean
                    if (typeof recording !== 'boolean') {
                      return false;
                    }
                    break;
                  case 'getSession':
                    const session = keyboardHistory.getSession();
                    // Property: Should always return a valid session object
                    if (!session || typeof session !== 'object' ||
                        typeof session.isRecording !== 'boolean' ||
                        (session.startTime !== null && typeof session.startTime !== 'number') ||
                        !Array.isArray(session.events)) {
                      return false;
                    }
                    break;
                  case 'replay':
                    // Test replay with invalid events
                    if (invalidEvents !== undefined) {
                      try {
                        (keyboardHistory as any).replay(invalidEvents);
                      } catch (error) {
                        // Should throw meaningful error for invalid input
                        if (!(error instanceof Error) || !error.message || error.message.length === 0) {
                          return false;
                        }
                      }
                    } else {
                      // Test replay with no events (should handle gracefully)
                      keyboardHistory.replay();
                    }
                    break;
                  case 'stopReplay':
                    keyboardHistory.stopReplay();
                    break;
                  case 'isReplaying':
                    const replaying = keyboardHistory.isReplaying();
                    // Property: Should always return a boolean
                    if (typeof replaying !== 'boolean') {
                      return false;
                    }
                    break;
                }
              } catch (error) {
                // Property: Any thrown errors should be meaningful Error objects
                if (!(error instanceof Error) || !error.message || error.message.length === 0) {
                  return false; // Unhandled or meaningless exception
                }
                // Meaningful errors are acceptable for invalid operations
              }
            }
            
            // Property: Multiple replay calls should be handled gracefully
            try {
              keyboardHistory.replay();
              keyboardHistory.replay(); // Second call should either succeed or throw meaningful error
            } catch (error) {
              if (!(error instanceof Error) || !error.message || error.message.length === 0) {
                return false;
              }
            }
            
            // Property: stopReplay when not replaying should be handled gracefully
            try {
              keyboardHistory.stopReplay();
              keyboardHistory.stopReplay(); // Multiple calls should be safe
            } catch (error) {
              // stopReplay should never throw
              return false;
            }
            
            // Property: stop() when not recording should be handled gracefully
            try {
              keyboardHistory.stop();
              keyboardHistory.stop(); // Multiple calls should be safe
            } catch (error) {
              // stop() should never throw
              return false;
            }
            
            // Property: Multiple start() calls should be handled gracefully
            try {
              keyboardHistory.start();
              keyboardHistory.start(); // Multiple calls should be safe
            } catch (error) {
              // start() should never throw
              return false;
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});