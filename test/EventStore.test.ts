import { EventStore } from '../src/EventStore';
import { KeyEvent } from '../src/types';

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
});