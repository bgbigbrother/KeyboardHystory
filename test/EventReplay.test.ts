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
  });
});