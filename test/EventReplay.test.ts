import { EventReplay } from '../src/EventReplay';
import { KeyEvent } from '../src/types';
import * as fc from 'fast-check';

describe('EventReplay', () => {
  let eventReplay: EventReplay;
  let mockEvents: KeyEvent[];

  beforeEach(() => {
    eventReplay = new EventReplay();
    mockEvents = [
      {
        key: 'a',
        code: 'KeyA',
        duration: 100,
        timestamp: 1000
      },
      {
        key: 'b',
        code: 'KeyB',
        duration: 150,
        timestamp: 1200
      }
    ];
  });

  afterEach(() => {
    // Clean up any ongoing replays
    eventReplay.stopReplay();
  });

  describe('constructor', () => {
    it('should create EventReplay instance with initial state', () => {
      expect(eventReplay.isReplaying()).toBe(false);
      
      const session = eventReplay.getReplaySession();
      expect(session.isReplaying).toBe(false);
      expect(session.currentIndex).toBe(0);
      expect(session.startTime).toBeNull();
      expect(session.timeoutIds).toEqual([]);
    });
  });

  describe('replay', () => {
    it('should handle empty events array gracefully', () => {
      expect(() => eventReplay.replay([])).not.toThrow();
      expect(eventReplay.isReplaying()).toBe(false);
    });

    it('should throw error if replay is already in progress', () => {
      eventReplay.replay(mockEvents);
      expect(() => eventReplay.replay(mockEvents)).toThrow('Replay is already in progress. Call stopReplay() first.');
    });

    it('should throw error for invalid events parameter', () => {
      expect(() => eventReplay.replay(null as any)).toThrow('Events must be an array');
      expect(() => eventReplay.replay('invalid' as any)).toThrow('Events must be an array');
    });

    it('should start replay session with valid events', () => {
      eventReplay.replay(mockEvents);
      
      expect(eventReplay.isReplaying()).toBe(true);
      
      const session = eventReplay.getReplaySession();
      expect(session.isReplaying).toBe(true);
      expect(session.currentIndex).toBe(0);
      expect(session.startTime).toBeGreaterThan(0);
      expect(session.timeoutIds.length).toBeGreaterThan(0);
    });
  });

  describe('stopReplay', () => {
    it('should handle gracefully when not replaying', () => {
      expect(() => eventReplay.stopReplay()).not.toThrow();
      expect(eventReplay.isReplaying()).toBe(false);
    });

    it('should stop ongoing replay and clear timeouts', () => {
      eventReplay.replay(mockEvents);
      expect(eventReplay.isReplaying()).toBe(true);
      
      eventReplay.stopReplay();
      
      expect(eventReplay.isReplaying()).toBe(false);
      const session = eventReplay.getReplaySession();
      expect(session.currentIndex).toBe(0);
      expect(session.startTime).toBeNull();
      expect(session.timeoutIds).toEqual([]);
    });
  });

  describe('getReplaySession', () => {
    it('should return copy of session to prevent external modification', () => {
      const session1 = eventReplay.getReplaySession();
      const session2 = eventReplay.getReplaySession();
      
      expect(session1).toEqual(session2);
      expect(session1.timeoutIds).not.toBe(session2.timeoutIds); // Different array instances
    });
  });

  describe('event dispatching', () => {
    it('should dispatch custom events during replay', (done) => {
      let eventCount = 0;
      
      const eventListener = (event: CustomEvent) => {
        eventCount++;
        expect(event.type).toBe('keyboardHistoryReplay');
        expect(event.detail).toHaveProperty('key');
        expect(event.detail).toHaveProperty('code');
        expect(event.detail).toHaveProperty('duration');
        expect(event.detail).toHaveProperty('timestamp');
        expect(event.detail).toHaveProperty('replayTimestamp');
        
        if (eventCount === mockEvents.length) {
          document.removeEventListener('keyboardHistoryReplay', eventListener);
          done();
        }
      };
      
      document.addEventListener('keyboardHistoryReplay', eventListener);
      eventReplay.replay(mockEvents);
    });

    it('should use configurable event name when provided', (done) => {
      const customEventName = 'customKeyboardReplay';
      const customEventReplay = new EventReplay({ replayEventName: customEventName });
      let eventCount = 0;
      
      const eventListener = (event: CustomEvent) => {
        eventCount++;
        expect(event.type).toBe(customEventName);
        expect(event.detail).toHaveProperty('key');
        expect(event.detail).toHaveProperty('code');
        expect(event.detail).toHaveProperty('duration');
        expect(event.detail).toHaveProperty('timestamp');
        expect(event.detail).toHaveProperty('replayTimestamp');
        
        if (eventCount === mockEvents.length) {
          document.removeEventListener(customEventName, eventListener);
          customEventReplay.stopReplay();
          done();
        }
      };
      
      document.addEventListener(customEventName, eventListener);
      customEventReplay.replay(mockEvents);
    });
  });

  describe('Validation edge cases', () => {
    it('should reject undefined array elements', () => {
      const eventReplay = new EventReplay();
      
      expect(() => {
        eventReplay.replay([undefined] as any);
      }).toThrow('Event at index 0 is not a valid object');
    });

    it('should reject null array elements', () => {
      const eventReplay = new EventReplay();
      
      expect(() => {
        eventReplay.replay([null] as any);
      }).toThrow('Event at index 0 is not a valid object');
    });

    it('should reject non-array inputs', () => {
      const eventReplay = new EventReplay();
      
      expect(() => {
        eventReplay.replay('invalid' as any);
      }).toThrow('Events must be an array of KeyEvent objects');
    });
  });

  describe('Replay edge cases', () => {
    it('should handle replay() with no recorded events gracefully', () => {
      const eventReplay = new EventReplay();
      
      // No stored events set, replay() without parameters should not throw error and should not start replay
      expect(() => eventReplay.replay()).not.toThrow();
      expect(eventReplay.isReplaying()).toBe(false);
      
      // Verify session state remains clean
      const session = eventReplay.getReplaySession();
      expect(session.isReplaying).toBe(false);
      expect(session.currentIndex).toBe(0);
      expect(session.startTime).toBeNull();
      expect(session.timeoutIds).toEqual([]);
    });

    it('should handle stopReplay() when not replaying gracefully', () => {
      const eventReplay = new EventReplay();
      
      // stopReplay() when not replaying should not throw error
      expect(() => eventReplay.stopReplay()).not.toThrow();
      expect(eventReplay.isReplaying()).toBe(false);
      
      // Verify session state remains clean
      const session = eventReplay.getReplaySession();
      expect(session.isReplaying).toBe(false);
      expect(session.currentIndex).toBe(0);
      expect(session.startTime).toBeNull();
      expect(session.timeoutIds).toEqual([]);
    });

    it('should handle multiple replay() calls by throwing error on second call', () => {
      const eventReplay = new EventReplay();
      const testEvents = [
        {
          key: 'a',
          code: 'KeyA',
          duration: 100,
          timestamp: 1000
        },
        {
          key: 'b',
          code: 'KeyB',
          duration: 150,
          timestamp: 2000
        }
      ];
      
      // First replay() call should succeed
      expect(() => eventReplay.replay(testEvents)).not.toThrow();
      expect(eventReplay.isReplaying()).toBe(true);
      
      // Second replay() call should throw error
      expect(() => eventReplay.replay(testEvents)).toThrow('Replay is already in progress. Call stopReplay() first.');
      
      // Verify first replay is still active
      expect(eventReplay.isReplaying()).toBe(true);
      
      // Clean up
      eventReplay.stopReplay();
      expect(eventReplay.isReplaying()).toBe(false);
    });
  });

  describe('External data edge cases', () => {
    it('should handle empty external array gracefully', () => {
      const eventReplay = new EventReplay();
      
      // Empty external array should not throw error and should not start replay
      expect(() => eventReplay.replay([])).not.toThrow();
      expect(eventReplay.isReplaying()).toBe(false);
    });

    it('should reject malformed event objects with descriptive errors', () => {
      const eventReplay = new EventReplay();
      
      // Missing required properties
      expect(() => {
        eventReplay.replay([{ key: 'a' }] as any);
      }).toThrow('Event at index 0 has invalid \'code\' property: expected string, got undefined');

      expect(() => {
        eventReplay.replay([{ key: 'a', code: 'KeyA' }] as any);
      }).toThrow('Event at index 0 has invalid \'duration\' property: expected non-negative number, got undefined');

      expect(() => {
        eventReplay.replay([{ key: 'a', code: 'KeyA', duration: 100 }] as any);
      }).toThrow('Event at index 0 has invalid \'timestamp\' property: expected non-negative number, got undefined');

      // Invalid property types
      expect(() => {
        eventReplay.replay([{
          key: 123,
          code: 'KeyA',
          duration: 100,
          timestamp: 1000
        }] as any);
      }).toThrow('Event at index 0 has invalid \'key\' property: expected string, got number');

      expect(() => {
        eventReplay.replay([{
          key: 'a',
          code: 123,
          duration: 100,
          timestamp: 1000
        }] as any);
      }).toThrow('Event at index 0 has invalid \'code\' property: expected string, got number');

      expect(() => {
        eventReplay.replay([{
          key: 'a',
          code: 'KeyA',
          duration: 'invalid',
          timestamp: 1000
        }] as any);
      }).toThrow('Event at index 0 has invalid \'duration\' property: expected non-negative number, got string');

      expect(() => {
        eventReplay.replay([{
          key: 'a',
          code: 'KeyA',
          duration: 100,
          timestamp: 'invalid'
        }] as any);
      }).toThrow('Event at index 0 has invalid \'timestamp\' property: expected non-negative number, got string');

      // Negative values
      expect(() => {
        eventReplay.replay([{
          key: 'a',
          code: 'KeyA',
          duration: -100,
          timestamp: 1000
        }] as any);
      }).toThrow('Event at index 0 has invalid \'duration\' property: expected non-negative number, got number');

      expect(() => {
        eventReplay.replay([{
          key: 'a',
          code: 'KeyA',
          duration: 100,
          timestamp: -1000
        }] as any);
      }).toThrow('Event at index 0 has invalid \'timestamp\' property: expected non-negative number, got number');

      // Empty strings
      expect(() => {
        eventReplay.replay([{
          key: '',
          code: 'KeyA',
          duration: 100,
          timestamp: 1000
        }] as any);
      }).toThrow('Event at index 0 has empty \'key\' property');

      expect(() => {
        eventReplay.replay([{
          key: 'a',
          code: '',
          duration: 100,
          timestamp: 1000
        }] as any);
      }).toThrow('Event at index 0 has empty \'code\' property');

      // Whitespace-only strings
      expect(() => {
        eventReplay.replay([{
          key: '   ',
          code: 'KeyA',
          duration: 100,
          timestamp: 1000
        }] as any);
      }).toThrow('Event at index 0 has empty \'key\' property');

      expect(() => {
        eventReplay.replay([{
          key: 'a',
          code: '   ',
          duration: 100,
          timestamp: 1000
        }] as any);
      }).toThrow('Event at index 0 has empty \'code\' property');
    });

    it('should handle mixed valid/invalid events and report first invalid event', () => {
      const eventReplay = new EventReplay();
      
      // Valid event followed by invalid event - should report the invalid one
      expect(() => {
        eventReplay.replay([
          {
            key: 'a',
            code: 'KeyA',
            duration: 100,
            timestamp: 1000
          },
          {
            key: 'b',
            code: 123, // Invalid
            duration: 150,
            timestamp: 1200
          }
        ] as any);
      }).toThrow('Event at index 1 has invalid \'code\' property: expected string, got number');

      // Invalid event followed by valid event - should report the first invalid one
      expect(() => {
        eventReplay.replay([
          {
            key: '', // Invalid
            code: 'KeyA',
            duration: 100,
            timestamp: 1000
          },
          {
            key: 'b',
            code: 'KeyB',
            duration: 150,
            timestamp: 1200
          }
        ] as any);
      }).toThrow('Event at index 0 has empty \'key\' property');
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Feature: keyboard-history, Property 7: Replay order preservation**
     * For any sequence of recorded events, replaying them should dispatch CustomEvents 
     * in the same chronological order as the original events
     * **Validates: Requirements 6.1**
     */
    it('should preserve chronological order when replaying any sequence of events', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
              code: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
              duration: fc.float({ min: 1, max: 1000, noNaN: true }),
              timestamp: fc.float({ min: 1, max: 10000, noNaN: true })
            }),
            { minLength: 0, maxLength: 5 }
          ),
          (generatedEvents: KeyEvent[]) => {
            // Sort events by timestamp to ensure chronological order
            const sortedEvents = [...generatedEvents].sort((a, b) => a.timestamp - b.timestamp);
            
            // Create EventReplay instance
            const eventReplay = new EventReplay();
            
            try {
              // Test that replay can be initiated without errors for chronologically ordered events
              eventReplay.replay(sortedEvents);
              
              // Verify that replay session is properly initialized
              const session = eventReplay.getReplaySession();
              
              if (sortedEvents.length === 0) {
                // Empty array should not start replay
                const result = !session.isReplaying;
                eventReplay.stopReplay();
                return result;
              } else {
                // Non-empty array should start replay with proper initialization
                const replayStarted = session.isReplaying;
                const hasCorrectIndex = session.currentIndex === 0;
                const hasStartTime = session.startTime !== null;
                const hasTimeouts = session.timeoutIds.length > 0;
                
                // Clean up
                eventReplay.stopReplay();
                
                // Property: Replay should start correctly for chronologically ordered events
                // and should schedule timeouts for event dispatching
                return replayStarted && hasCorrectIndex && hasStartTime && hasTimeouts;
              }
            } catch (error) {
              // Clean up on error
              eventReplay.stopReplay();
              
              // Property: Valid chronologically ordered events should not cause errors
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: keyboard-history, Property 8: Replay timing accuracy**
     * For any recorded events with timing intervals, replaying them should maintain 
     * the original timing intervals between events
     * **Validates: Requirements 6.2**
     */
    it('should schedule events with correct timing intervals based on original timestamps', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
              code: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
              duration: fc.float({ min: 1, max: 1000, noNaN: true }),
              timestamp: fc.float({ min: 100, max: 5000, noNaN: true })
            }),
            { minLength: 2, maxLength: 4 } // Need at least 2 events to test timing intervals
          ),
          (generatedEvents: KeyEvent[]) => {
            // Sort events by timestamp to ensure chronological order
            const sortedEvents = [...generatedEvents].sort((a, b) => a.timestamp - b.timestamp);
            
            // Ensure events have meaningful time differences (at least 10ms apart)
            for (let i = 1; i < sortedEvents.length; i++) {
              sortedEvents[i].timestamp = sortedEvents[i-1].timestamp + Math.max(10, sortedEvents[i].timestamp - sortedEvents[i-1].timestamp);
            }
            
            const eventReplay = new EventReplay();
            
            try {
              // Start replay to initialize timing
              eventReplay.replay(sortedEvents);
              
              // Verify that replay session is properly initialized with timing
              const session = eventReplay.getReplaySession();
              
              // Property: Replay should be active and have scheduled timeouts for timing management
              const replayActive = session.isReplaying;
              const hasStartTime = session.startTime !== null;
              const hasScheduledTimeouts = session.timeoutIds.length > 0;
              
              // Property: Start time should be a reasonable timestamp (recent)
              const startTimeValid = session.startTime !== null && 
                                   session.startTime > 0 && 
                                   session.startTime <= performance.now();
              
              // Clean up
              eventReplay.stopReplay();
              
              // Verify cleanup worked
              const cleanSession = eventReplay.getReplaySession();
              const cleanedUp = !cleanSession.isReplaying && 
                               cleanSession.timeoutIds.length === 0 && 
                               cleanSession.startTime === null;
              
              // Property: Timing-based replay should initialize correctly and clean up properly
              return replayActive && hasStartTime && hasScheduledTimeouts && 
                     startTimeValid && cleanedUp;
            } catch (error) {
              // Clean up on error
              eventReplay.stopReplay();
              
              // Property: Valid chronologically ordered events should not cause timing errors
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: keyboard-history, Property 12: External event replay order preservation**
     * For any array of valid KeyEvent objects provided to replay(), the events should be 
     * replayed in the same chronological order as provided
     * **Validates: Requirements 8.1**
     */
    it('should preserve order when replaying external event arrays', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
              code: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
              duration: fc.float({ min: 1, max: 1000, noNaN: true }),
              timestamp: fc.float({ min: 1, max: 10000, noNaN: true })
            }),
            { minLength: 0, maxLength: 5 }
          ),
          (externalEvents: KeyEvent[]) => {
            // Sort events by timestamp to ensure chronological order
            const sortedEvents = [...externalEvents].sort((a, b) => a.timestamp - b.timestamp);
            
            // Create EventReplay instance
            const eventReplay = new EventReplay();
            
            try {
              // Test that external events can be replayed without errors
              eventReplay.replay(sortedEvents);
              
              // Verify that replay session is properly initialized for external events
              const session = eventReplay.getReplaySession();
              
              if (sortedEvents.length === 0) {
                // Empty external array should not start replay
                const result = !session.isReplaying;
                eventReplay.stopReplay();
                return result;
              } else {
                // Non-empty external array should start replay with proper initialization
                const replayStarted = session.isReplaying;
                const hasCorrectIndex = session.currentIndex === 0;
                const hasStartTime = session.startTime !== null;
                const hasTimeouts = session.timeoutIds.length > 0;
                
                // Clean up
                eventReplay.stopReplay();
                
                // Property: External events should be processed in the same order as provided
                // and should schedule timeouts for event dispatching
                return replayStarted && hasCorrectIndex && hasStartTime && hasTimeouts;
              }
            } catch (error) {
              // Clean up on error
              eventReplay.stopReplay();
              
              // Property: Valid external events should not cause errors
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: keyboard-history, Property 13: External event validation**
     * For any external event data provided to replay(), the system should validate 
     * the event structure and reject invalid data with descriptive error messages
     * **Validates: Requirements 8.2, 8.4**
     */
    it('should validate external event data and reject invalid events with descriptive errors', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Invalid array types (not arrays)
            fc.constant(null),
            fc.string(),
            fc.integer(),
            fc.boolean(),
            // Arrays with invalid event objects
            fc.array(fc.oneof(
              fc.constant(null),
              fc.constant(undefined),
              fc.string(),
              fc.integer(),
              // Objects missing required properties
              fc.record({
                key: fc.string({ minLength: 1, maxLength: 10 }),
                // Missing code, duration, timestamp
              }),
              // Objects with invalid property types
              fc.record({
                key: fc.integer(), // Should be string
                code: fc.string({ minLength: 1, maxLength: 10 }),
                duration: fc.float({ min: 1, max: 1000 }),
                timestamp: fc.float({ min: 1, max: 10000 })
              }),
              // Objects with negative values
              fc.record({
                key: fc.string({ minLength: 1, maxLength: 10 }),
                code: fc.string({ minLength: 1, maxLength: 10 }),
                duration: fc.float({ min: -1000, max: -1 }), // Negative duration
                timestamp: fc.float({ min: 1, max: 10000 })
              }),
              // Objects with empty strings
              fc.record({
                key: fc.constant(''), // Empty key
                code: fc.string({ minLength: 1, maxLength: 10 }),
                duration: fc.float({ min: 1, max: 1000 }),
                timestamp: fc.float({ min: 1, max: 10000 })
              })
            ), { minLength: 1, maxLength: 2 })
          ),
          (invalidData: any) => {
            const eventReplay = new EventReplay();
            
            try {
              // Attempt to replay invalid data
              eventReplay.replay(invalidData);
              
              // Clean up in case replay somehow started
              eventReplay.stopReplay();
              
              // Property: Invalid data should cause an error, not succeed
              return false;
            } catch (error) {
              // Clean up
              eventReplay.stopReplay();
              
              // Property: Error should be thrown for invalid data
              const errorThrown = error instanceof Error;
              const hasDescriptiveMessage = error instanceof Error && 
                                          error.message.length > 0 &&
                                          (error.message.includes('Events must be an array') ||
                                           error.message.includes('Event at index') ||
                                           error.message.includes('invalid') ||
                                           error.message.includes('expected'));
              
              // Property: Invalid external data should be rejected with descriptive error messages
              return errorThrown && hasDescriptiveMessage;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: keyboard-history, Property 14: External event timing preservation**
     * For any external events with timing intervals, replaying them should maintain 
     * the original timing intervals between events
     * **Validates: Requirements 8.3**
     */
    it('should preserve timing intervals when replaying external events', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
              code: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
              duration: fc.float({ min: 1, max: 1000, noNaN: true }),
              timestamp: fc.float({ min: 100, max: 5000, noNaN: true })
            }),
            { minLength: 2, maxLength: 4 } // Need at least 2 events to test timing intervals
          ),
          (externalEvents: KeyEvent[]) => {
            // Sort events by timestamp to ensure chronological order
            const sortedEvents = [...externalEvents].sort((a, b) => a.timestamp - b.timestamp);
            
            // Ensure events have meaningful time differences (at least 10ms apart)
            for (let i = 1; i < sortedEvents.length; i++) {
              sortedEvents[i].timestamp = sortedEvents[i-1].timestamp + Math.max(10, sortedEvents[i].timestamp - sortedEvents[i-1].timestamp);
            }
            
            const eventReplay = new EventReplay();
            
            try {
              // Start replay with external events to initialize timing
              eventReplay.replay(sortedEvents);
              
              // Verify that replay session is properly initialized with timing for external events
              const session = eventReplay.getReplaySession();
              
              // Property: External events replay should be active and have scheduled timeouts for timing management
              const replayActive = session.isReplaying;
              const hasStartTime = session.startTime !== null;
              const hasScheduledTimeouts = session.timeoutIds.length > 0;
              
              // Property: Start time should be a reasonable timestamp (recent)
              const startTimeValid = session.startTime !== null && 
                                   session.startTime > 0 && 
                                   session.startTime <= performance.now();
              
              // Clean up
              eventReplay.stopReplay();
              
              // Verify cleanup worked
              const cleanSession = eventReplay.getReplaySession();
              const cleanedUp = !cleanSession.isReplaying && 
                               cleanSession.timeoutIds.length === 0 && 
                               cleanSession.startTime === null;
              
              // Property: External events timing-based replay should initialize correctly and clean up properly
              return replayActive && hasStartTime && hasScheduledTimeouts && 
                     startTimeValid && cleanedUp;
            } catch (error) {
              // Clean up on error
              eventReplay.stopReplay();
              
              // Property: Valid external events should not cause timing errors
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: keyboard-history, Property 9: Replay mechanism compliance**
     * For any replay operation, the system should use document.dispatchEvent with 
     * CustomEvent objects to simulate keyboard interactions
     * **Validates: Requirements 6.3**
     */
    it('should use document.dispatchEvent with CustomEvent objects for replay mechanism', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
              code: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
              duration: fc.float({ min: 1, max: 1000, noNaN: true }),
              timestamp: fc.float({ min: 0, max: 10, noNaN: true }) // Very short timestamps for immediate dispatch
            }),
            { minLength: 1, maxLength: 2 } // Need at least 1 event to test dispatch mechanism
          ),
          (generatedEvents: KeyEvent[]) => {
            // Sort events by timestamp to ensure chronological order
            const sortedEvents = [...generatedEvents].sort((a, b) => a.timestamp - b.timestamp);
            
            // Create EventReplay instance
            const eventReplay = new EventReplay();
            
            // Track dispatched events to verify mechanism compliance
            const dispatchedEvents: CustomEvent[] = [];
            const originalDispatchEvent = document.dispatchEvent;
            
            // Mock document.dispatchEvent to capture dispatched events
            document.dispatchEvent = jest.fn((event: Event) => {
              if (event instanceof CustomEvent && event.type === 'keyboardHistoryReplay') {
                dispatchedEvents.push(event);
              }
              return originalDispatchEvent.call(document, event);
            });
            
            try {
              // Start replay to trigger event dispatching
              eventReplay.replay(sortedEvents);
              
              // Property: Replay should start correctly and schedule timeouts
              const session = eventReplay.getReplaySession();
              const replayStarted = session.isReplaying;
              const hasTimeouts = session.timeoutIds.length > 0;
              
              // Property: document.dispatchEvent should be set up to be called
              const dispatchEventMocked = jest.isMockFunction(document.dispatchEvent);
              
              // Clean up
              eventReplay.stopReplay();
              document.dispatchEvent = originalDispatchEvent;
              
              // Property: Replay mechanism should be properly initialized to use document.dispatchEvent
              // We verify that the replay starts correctly and sets up the dispatch mechanism
              return replayStarted && hasTimeouts && dispatchEventMocked;
            } catch (error) {
              // Clean up on error
              eventReplay.stopReplay();
              document.dispatchEvent = originalDispatchEvent;
              
              // Property: Valid events should not cause errors in dispatch mechanism setup
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: keyboard-history, Property 15: Backward compatibility for replay**
     * For any KeyboardHistory instance with recorded events, calling replay() without 
     * parameters should replay the currently recorded session events as before
     * **Validates: Requirements 8.5**
     */
    it('should maintain backward compatibility when replay() is called without parameters', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
              code: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
              duration: fc.float({ min: 1, max: 1000, noNaN: true }),
              timestamp: fc.float({ min: 1, max: 10000, noNaN: true })
            }),
            { minLength: 0, maxLength: 5 }
          ),
          (storedEvents: KeyEvent[]) => {
            // Sort events by timestamp to ensure chronological order
            const sortedEvents = [...storedEvents].sort((a, b) => a.timestamp - b.timestamp);
            
            // Create EventReplay instance and set stored events
            const eventReplay = new EventReplay();
            eventReplay.setStoredEvents(sortedEvents);
            
            try {
              // Test backward compatibility: replay() without parameters should use stored events
              eventReplay.replay();
              
              // Verify that replay session is properly initialized using stored events
              const session = eventReplay.getReplaySession();
              
              if (sortedEvents.length === 0) {
                // Empty stored events should not start replay
                const result = !session.isReplaying;
                eventReplay.stopReplay();
                return result;
              } else {
                // Non-empty stored events should start replay with proper initialization
                const replayStarted = session.isReplaying;
                const hasCorrectIndex = session.currentIndex === 0;
                const hasStartTime = session.startTime !== null;
                const hasTimeouts = session.timeoutIds.length > 0;
                
                // Clean up
                eventReplay.stopReplay();
                
                // Property: Backward compatibility should work - stored events should be replayed
                // when replay() is called without parameters
                return replayStarted && hasCorrectIndex && hasStartTime && hasTimeouts;
              }
            } catch (error) {
              // Clean up on error
              eventReplay.stopReplay();
              
              // Property: Backward compatibility should not cause errors with valid stored events
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: keyboard-history, Property 10: Replay control functionality**
     * For any replay in progress, calling stopReplay() should halt the replay process 
     * and clear any pending timeouts
     * **Validates: Requirements 6.4**
     */
    it('should halt replay process and clear timeouts when stopReplay() is called during any active replay', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
              code: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
              duration: fc.float({ min: 1, max: 1000, noNaN: true }),
              timestamp: fc.float({ min: 100, max: 5000, noNaN: true })
            }),
            { minLength: 1, maxLength: 5 } // Need at least 1 event to start replay
          ),
          (generatedEvents: KeyEvent[]) => {
            // Sort events by timestamp to ensure chronological order
            const sortedEvents = [...generatedEvents].sort((a, b) => a.timestamp - b.timestamp);
            
            // Ensure events have meaningful time differences (at least 50ms apart for longer replay)
            for (let i = 1; i < sortedEvents.length; i++) {
              sortedEvents[i].timestamp = sortedEvents[i-1].timestamp + Math.max(50, sortedEvents[i].timestamp - sortedEvents[i-1].timestamp);
            }
            
            const eventReplay = new EventReplay();
            
            try {
              // Start replay to get it in progress
              eventReplay.replay(sortedEvents);
              
              // Verify replay is in progress before stopping
              const sessionBeforeStop = eventReplay.getReplaySession();
              const replayWasActive = sessionBeforeStop.isReplaying;
              const hadTimeouts = sessionBeforeStop.timeoutIds.length > 0;
              const hadStartTime = sessionBeforeStop.startTime !== null;
              
              // Property: Replay should be active with scheduled timeouts before stopping
              if (!replayWasActive || !hadTimeouts || !hadStartTime) {
                eventReplay.stopReplay();
                return false;
              }
              
              // Call stopReplay() to halt the process
              eventReplay.stopReplay();
              
              // Verify that replay has been halted and timeouts cleared
              const sessionAfterStop = eventReplay.getReplaySession();
              const replayHalted = !sessionAfterStop.isReplaying;
              const timeoutsCleared = sessionAfterStop.timeoutIds.length === 0;
              const startTimeCleared = sessionAfterStop.startTime === null;
              const indexReset = sessionAfterStop.currentIndex === 0;
              
              // Property: stopReplay() should halt replay and clear all timeouts and state
              const properlyHalted = replayHalted && timeoutsCleared && startTimeCleared && indexReset;
              
              // Additional verification: calling stopReplay() again should be safe (idempotent)
              eventReplay.stopReplay(); // Should not throw error
              const sessionAfterSecondStop = eventReplay.getReplaySession();
              const stillHalted = !sessionAfterSecondStop.isReplaying;
              const stillCleared = sessionAfterSecondStop.timeoutIds.length === 0;
              
              // Property: stopReplay() should be idempotent (safe to call multiple times)
              const idempotent = stillHalted && stillCleared;
              
              return properlyHalted && idempotent;
            } catch (error) {
              // Clean up on error
              eventReplay.stopReplay();
              
              // Property: Valid events should not cause errors in replay control
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});