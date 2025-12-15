import { EventStore } from '../src/EventStore';
import { KeyEvent } from '../src/types';
import * as fc from 'fast-check';

describe('EventStore', () => {
  let eventStore: EventStore;

  beforeEach(() => {
    eventStore = new EventStore();
  });

  describe('Constructor', () => {
    test('creates EventStore with default configuration', () => {
      const store = new EventStore();
      expect(store).toBeInstanceOf(EventStore);
      expect(store.getEventCount()).toBe(0);
    });

    test('creates EventStore with custom maxEvents configuration', () => {
      const store = new EventStore({ maxEvents: 5000 });
      expect(store).toBeInstanceOf(EventStore);
      expect(store.getEventCount()).toBe(0);
    });
  });

  describe('addEvent', () => {
    test('adds valid KeyEvent to storage', () => {
      const event: KeyEvent = {
        key: 'a',
        duration: 150,
        timestamp: Date.now(),
        code: 'KeyA'
      };

      eventStore.addEvent(event);
      expect(eventStore.getEventCount()).toBe(1);
    });

    test('throws error for invalid event object', () => {
      expect(() => {
        eventStore.addEvent(null as any);
      }).toThrow('Event must be a valid object');

      expect(() => {
        eventStore.addEvent(undefined as any);
      }).toThrow('Event must be a valid object');

      expect(() => {
        eventStore.addEvent('invalid' as any);
      }).toThrow('Event must be a valid object');
    });

    test('throws error for invalid key property', () => {
      const invalidEvent = {
        key: '',
        duration: 150,
        timestamp: Date.now(),
        code: 'KeyA'
      };

      expect(() => {
        eventStore.addEvent(invalidEvent as KeyEvent);
      }).toThrow('Event key must be a non-empty string');
    });

    test('throws error for invalid code property', () => {
      const invalidEvent = {
        key: 'a',
        duration: 150,
        timestamp: Date.now(),
        code: ''
      };

      expect(() => {
        eventStore.addEvent(invalidEvent as KeyEvent);
      }).toThrow('Event code must be a non-empty string');
    });

    test('throws error for invalid duration property', () => {
      const invalidEvent = {
        key: 'a',
        duration: -1,
        timestamp: Date.now(),
        code: 'KeyA'
      };

      expect(() => {
        eventStore.addEvent(invalidEvent as KeyEvent);
      }).toThrow('Event duration must be a non-negative number');
    });

    test('throws error for invalid timestamp property', () => {
      const invalidEvent = {
        key: 'a',
        duration: 150,
        timestamp: 0,
        code: 'KeyA'
      };

      expect(() => {
        eventStore.addEvent(invalidEvent as KeyEvent);
      }).toThrow('Event timestamp must be a positive number');
    });
  });

  describe('getAllEvents', () => {
    test('returns empty array when no events stored', () => {
      const events = eventStore.getAllEvents();
      expect(events).toEqual([]);
      expect(Array.isArray(events)).toBe(true);
    });

    test('returns copy of events array', () => {
      const event: KeyEvent = {
        key: 'a',
        duration: 150,
        timestamp: Date.now(),
        code: 'KeyA'
      };

      eventStore.addEvent(event);
      const events1 = eventStore.getAllEvents();
      const events2 = eventStore.getAllEvents();

      expect(events1).toEqual(events2);
      expect(events1).not.toBe(events2); // Different array instances
    });

    test('returns events in chronological order', () => {
      const event1: KeyEvent = {
        key: 'a',
        duration: 100,
        timestamp: 1000,
        code: 'KeyA'
      };

      const event2: KeyEvent = {
        key: 'b',
        duration: 150,
        timestamp: 2000,
        code: 'KeyB'
      };

      eventStore.addEvent(event1);
      eventStore.addEvent(event2);

      const events = eventStore.getAllEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual(event1);
      expect(events[1]).toEqual(event2);
    });
  });

  describe('Memory Management', () => {
    test('removes oldest events when maxEvents limit exceeded', () => {
      const store = new EventStore({ maxEvents: 2 });

      const event1: KeyEvent = {
        key: 'a',
        duration: 100,
        timestamp: 1000,
        code: 'KeyA'
      };

      const event2: KeyEvent = {
        key: 'b',
        duration: 150,
        timestamp: 2000,
        code: 'KeyB'
      };

      const event3: KeyEvent = {
        key: 'c',
        duration: 200,
        timestamp: 3000,
        code: 'KeyC'
      };

      store.addEvent(event1);
      store.addEvent(event2);
      expect(store.getEventCount()).toBe(2);

      store.addEvent(event3);
      expect(store.getEventCount()).toBe(2);

      const events = store.getAllEvents();
      expect(events[0]).toEqual(event2);
      expect(events[1]).toEqual(event3);
    });
  });

  describe('clear', () => {
    test('removes all stored events', () => {
      const event: KeyEvent = {
        key: 'a',
        duration: 150,
        timestamp: Date.now(),
        code: 'KeyA'
      };

      eventStore.addEvent(event);
      expect(eventStore.getEventCount()).toBe(1);

      eventStore.clear();
      expect(eventStore.getEventCount()).toBe(0);
      expect(eventStore.getAllEvents()).toEqual([]);
    });
  });

  describe('getEventCount', () => {
    test('returns correct count of stored events', () => {
      expect(eventStore.getEventCount()).toBe(0);

      const event: KeyEvent = {
        key: 'a',
        duration: 150,
        timestamp: Date.now(),
        code: 'KeyA'
      };

      eventStore.addEvent(event);
      expect(eventStore.getEventCount()).toBe(1);

      eventStore.addEvent(event);
      expect(eventStore.getEventCount()).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    describe('Empty array return when no events recorded', () => {
      test('getAllEvents returns empty array immediately after construction', () => {
        const store = new EventStore();
        const events = store.getAllEvents();
        expect(events).toEqual([]);
        expect(events).toHaveLength(0);
        expect(Array.isArray(events)).toBe(true);
      });

      test('getAllEvents returns empty array after clear() is called', () => {
        const event: KeyEvent = {
          key: 'a',
          duration: 150,
          timestamp: Date.now(),
          code: 'KeyA'
        };

        eventStore.addEvent(event);
        expect(eventStore.getAllEvents()).toHaveLength(1);
        
        eventStore.clear();
        const events = eventStore.getAllEvents();
        expect(events).toEqual([]);
        expect(events).toHaveLength(0);
      });

      test('getEventCount returns 0 when no events recorded', () => {
        expect(eventStore.getEventCount()).toBe(0);
        
        // After clear
        const event: KeyEvent = {
          key: 'a',
          duration: 150,
          timestamp: Date.now(),
          code: 'KeyA'
        };
        eventStore.addEvent(event);
        eventStore.clear();
        expect(eventStore.getEventCount()).toBe(0);
      });
    });

    describe('Memory limit handling', () => {
      test('handles memory limit of 1 event correctly', () => {
        const store = new EventStore({ maxEvents: 1 });

        const event1: KeyEvent = {
          key: 'a',
          duration: 100,
          timestamp: 1000,
          code: 'KeyA'
        };

        const event2: KeyEvent = {
          key: 'b',
          duration: 150,
          timestamp: 2000,
          code: 'KeyB'
        };

        store.addEvent(event1);
        expect(store.getEventCount()).toBe(1);
        expect(store.getAllEvents()[0]).toEqual(event1);

        store.addEvent(event2);
        expect(store.getEventCount()).toBe(1);
        expect(store.getAllEvents()[0]).toEqual(event2);
      });

      test('handles large memory limit correctly', () => {
        const store = new EventStore({ maxEvents: 100000 });
        
        // Add many events up to but not exceeding limit
        for (let i = 0; i < 1000; i++) {
          const event: KeyEvent = {
            key: `key${i}`,
            duration: i,
            timestamp: i + 1,
            code: `Code${i}`
          };
          store.addEvent(event);
        }

        expect(store.getEventCount()).toBe(1000);
        const events = store.getAllEvents();
        expect(events).toHaveLength(1000);
        expect(events[0].key).toBe('key0');
        expect(events[999].key).toBe('key999');
      });

      test('handles memory limit with zero maxEvents configuration', () => {
        const store = new EventStore({ maxEvents: 0 });

        const event: KeyEvent = {
          key: 'a',
          duration: 100,
          timestamp: 1000,
          code: 'KeyA'
        };

        store.addEvent(event);
        // With maxEvents: 0, events should be immediately removed
        expect(store.getEventCount()).toBe(0);
        expect(store.getAllEvents()).toEqual([]);
      });

      test('maintains chronological order during memory limit enforcement', () => {
        const store = new EventStore({ maxEvents: 3 });

        const events: KeyEvent[] = [];
        for (let i = 0; i < 5; i++) {
          const event: KeyEvent = {
            key: `key${i}`,
            duration: 100,
            timestamp: 1000 + i,
            code: `Code${i}`
          };
          events.push(event);
          store.addEvent(event);
        }

        expect(store.getEventCount()).toBe(3);
        const storedEvents = store.getAllEvents();
        
        // Should contain the last 3 events in chronological order
        expect(storedEvents[0]).toEqual(events[2]);
        expect(storedEvents[1]).toEqual(events[3]);
        expect(storedEvents[2]).toEqual(events[4]);
      });
    });

    describe('Event validation edge cases', () => {
      test('rejects events with non-string key types', () => {
        const invalidEvents = [
          { key: 123, duration: 100, timestamp: 1000, code: 'KeyA' },
          { key: null, duration: 100, timestamp: 1000, code: 'KeyA' },
          { key: undefined, duration: 100, timestamp: 1000, code: 'KeyA' },
          { key: [], duration: 100, timestamp: 1000, code: 'KeyA' },
          { key: {}, duration: 100, timestamp: 1000, code: 'KeyA' }
        ];

        invalidEvents.forEach(event => {
          expect(() => {
            eventStore.addEvent(event as any);
          }).toThrow('Event key must be a non-empty string');
        });
      });

      test('rejects events with non-string code types', () => {
        const invalidEvents = [
          { key: 'a', duration: 100, timestamp: 1000, code: 123 },
          { key: 'a', duration: 100, timestamp: 1000, code: null },
          { key: 'a', duration: 100, timestamp: 1000, code: undefined },
          { key: 'a', duration: 100, timestamp: 1000, code: [] },
          { key: 'a', duration: 100, timestamp: 1000, code: {} }
        ];

        invalidEvents.forEach(event => {
          expect(() => {
            eventStore.addEvent(event as any);
          }).toThrow('Event code must be a non-empty string');
        });
      });

      test('rejects events with invalid duration values', () => {
        const invalidEvents = [
          { key: 'a', duration: 'invalid', timestamp: 1000, code: 'KeyA' },
          { key: 'a', duration: null, timestamp: 1000, code: 'KeyA' },
          { key: 'a', duration: undefined, timestamp: 1000, code: 'KeyA' },
          { key: 'a', duration: NaN, timestamp: 1000, code: 'KeyA' },
          { key: 'a', duration: Infinity, timestamp: 1000, code: 'KeyA' },
          { key: 'a', duration: -Infinity, timestamp: 1000, code: 'KeyA' }
        ];

        invalidEvents.forEach(event => {
          expect(() => {
            eventStore.addEvent(event as any);
          }).toThrow('Event duration must be a non-negative number');
        });
      });

      test('rejects events with invalid timestamp values', () => {
        const invalidEvents = [
          { key: 'a', duration: 100, timestamp: 'invalid', code: 'KeyA' },
          { key: 'a', duration: 100, timestamp: null, code: 'KeyA' },
          { key: 'a', duration: 100, timestamp: undefined, code: 'KeyA' },
          { key: 'a', duration: 100, timestamp: NaN, code: 'KeyA' },
          { key: 'a', duration: 100, timestamp: -1, code: 'KeyA' },
          { key: 'a', duration: 100, timestamp: -Infinity, code: 'KeyA' }
        ];

        invalidEvents.forEach(event => {
          expect(() => {
            eventStore.addEvent(event as any);
          }).toThrow('Event timestamp must be a positive number');
        });
      });

      test('accepts events with edge case valid values', () => {
        const validEdgeCaseEvents: KeyEvent[] = [
          { key: ' ', duration: 0, timestamp: 0.1, code: 'Space' }, // Space character, zero duration, very small timestamp
          { key: 'Enter', duration: 0.001, timestamp: 1, code: 'Enter' }, // Very small duration, minimum positive timestamp
          { key: 'VeryLongKeyNameThatIsStillValid', duration: 999999, timestamp: Number.MAX_SAFE_INTEGER, code: 'CustomKey' }
        ];

        validEdgeCaseEvents.forEach(event => {
          expect(() => {
            eventStore.addEvent(event);
          }).not.toThrow();
        });

        expect(eventStore.getEventCount()).toBe(validEdgeCaseEvents.length);
      });

      test('rejects events missing required properties', () => {
        const incompleteEvents = [
          { duration: 100, timestamp: 1000, code: 'KeyA' }, // Missing key
          { key: 'a', timestamp: 1000, code: 'KeyA' }, // Missing duration
          { key: 'a', duration: 100, code: 'KeyA' }, // Missing timestamp
          { key: 'a', duration: 100, timestamp: 1000 }, // Missing code
          {} // Missing all properties
        ];

        incompleteEvents.forEach(event => {
          expect(() => {
            eventStore.addEvent(event as any);
          }).toThrow();
        });
      });
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Feature: keyboard-history, Property 4: Chronological ordering preservation**
     * **Validates: Requirements 3.4, 4.4**
     */
    test('should preserve chronological ordering for any sequence of events', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              code: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
              duration: fc.float({ min: 0, max: 10000, noNaN: true }),
              timestamp: fc.float({ min: 1, max: 1000000, noNaN: true })
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (events) => {
            const store = new EventStore();
            
            // Sort events by timestamp to create chronological order
            const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
            
            // Add events to store in chronological order
            for (const event of sortedEvents) {
              try {
                store.addEvent(event);
              } catch (error) {
                // Skip invalid events - this is expected behavior
                continue;
              }
            }
            
            // Retrieve events from store
            const retrievedEvents = store.getAllEvents();
            
            // Property: Events should be returned in the same chronological order they were added
            for (let i = 0; i < retrievedEvents.length - 1; i++) {
              const currentEvent = retrievedEvents[i];
              const nextEvent = retrievedEvents[i + 1];
              
              // Each event should have a timestamp less than or equal to the next event's timestamp
              if (currentEvent.timestamp > nextEvent.timestamp) {
                return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});