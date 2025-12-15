import { KeyEvent, KeyboardHistoryConfig, ReplaySession } from './types';

/**
 * EventReplay manages the simulation of recorded keyboard events.
 * It dispatches CustomEvents with proper timing to recreate the original keyboard interactions.
 */
export class EventReplay {
  private replaySession: ReplaySession;
  private config: KeyboardHistoryConfig;
  private storedEvents: KeyEvent[];

  constructor(config?: KeyboardHistoryConfig) {
    this.config = config || {};
    this.replaySession = {
      isReplaying: false,
      currentIndex: 0,
      startTime: null,
      timeoutIds: []
    };
    this.storedEvents = [];
  }

  /**
   * Sets the stored events that will be used for replay when no external events are provided.
   * @param events Array of KeyEvent objects to store for replay
   */
  setStoredEvents(events: KeyEvent[]): void {
    this.storedEvents = events || [];
  }

  /**
   * Replays a sequence of keyboard events by dispatching CustomEvents
   * with the original timing intervals between events.
   * @param events Optional array of KeyEvent objects to replay. If not provided, uses stored events.
   * @throws Error if replay is already in progress or events array is invalid
   */
  replay(events?: KeyEvent[]): void {
    if (this.replaySession.isReplaying) {
      throw new Error('Replay is already in progress. Call stopReplay() first.');
    }

    let eventsToReplay: KeyEvent[];
    
    if (events !== undefined) {
      // External events provided - validate them
      if (!Array.isArray(events)) {
        throw new Error('Events must be an array of KeyEvent objects');
      }
      eventsToReplay = events;
    } else {
      // No external events - use stored events
      eventsToReplay = this.storedEvents;
    }

    // Validate each event in the array
    this.validateEvents(eventsToReplay);

    // Handle empty events array gracefully
    if (eventsToReplay.length === 0) {
      return;
    }

    // Initialize replay session
    this.replaySession = {
      isReplaying: true,
      currentIndex: 0,
      startTime: performance.now(),
      timeoutIds: []
    };

    // Start replaying events
    this.scheduleNextEvent(eventsToReplay, 0);
  }

  /**
   * Stops the current replay process and clears all pending timeouts.
   */
  stopReplay(): void {
    if (!this.replaySession.isReplaying) {
      // Not currently replaying, handle gracefully
      return;
    }

    // Clear all pending timeouts
    this.replaySession.timeoutIds.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });

    // Reset replay session
    this.replaySession = {
      isReplaying: false,
      currentIndex: 0,
      startTime: null,
      timeoutIds: []
    };
  }

  /**
   * Returns whether a replay is currently in progress.
   * @returns True if replaying, false otherwise
   */
  isReplaying(): boolean {
    return this.replaySession.isReplaying;
  }

  /**
   * Gets the current replay session information.
   * @returns ReplaySession object with current state
   */
  getReplaySession(): ReplaySession {
    return {
      isReplaying: this.replaySession.isReplaying,
      currentIndex: this.replaySession.currentIndex,
      startTime: this.replaySession.startTime,
      timeoutIds: [...this.replaySession.timeoutIds] // Return copy to prevent external modification
    };
  }

  /**
   * Schedules the next event in the replay sequence with proper timing.
   * @param events Array of events being replayed
   * @param eventIndex Index of the current event to schedule
   */
  private scheduleNextEvent(events: KeyEvent[], eventIndex: number): void {
    if (!this.replaySession.isReplaying || eventIndex >= events.length) {
      // Replay was stopped or we've reached the end
      if (this.replaySession.isReplaying) {
        // Natural completion - reset session
        this.replaySession.isReplaying = false;
        this.replaySession.currentIndex = 0;
        this.replaySession.startTime = null;
        this.replaySession.timeoutIds = [];
      }
      return;
    }

    const currentEvent = events[eventIndex];
    let delay = 0;

    // Calculate delay based on timing
    if (this.replaySession.startTime !== null) {
      if (eventIndex === 0) {
        // For the first event, use its timestamp as the delay from replay start
        delay = currentEvent.timestamp;
      } else {
        // For subsequent events, calculate delay relative to the previous event
        const previousEventTime = events[eventIndex - 1].timestamp;
        const currentEventTime = currentEvent.timestamp;
        delay = currentEventTime - previousEventTime;
      }
    }

    // Schedule the event dispatch
    const timeoutId = setTimeout(() => {
      // Remove this timeout from tracking
      this.replaySession.timeoutIds = this.replaySession.timeoutIds.filter(id => id !== timeoutId);
      
      // Dispatch the custom event
      this.dispatchKeyEvent(currentEvent);
      
      // Update current index
      this.replaySession.currentIndex = eventIndex + 1;
      
      // Schedule next event
      this.scheduleNextEvent(events, eventIndex + 1);
    }, delay);

    // Track the timeout ID for cleanup
    this.replaySession.timeoutIds.push(timeoutId);
  }

  /**
   * Validates an array of KeyEvent objects to ensure they have the required structure.
   * @param events Array of events to validate
   * @throws Error if any event is invalid with descriptive error message
   */
  private validateEvents(events: KeyEvent[]): void {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      if (!event || typeof event !== 'object') {
        throw new Error(`Event at index ${i} is not a valid object`);
      }

      if (typeof event.key !== 'string') {
        throw new Error(`Event at index ${i} has invalid 'key' property: expected string, got ${typeof event.key}`);
      }

      if (typeof event.code !== 'string') {
        throw new Error(`Event at index ${i} has invalid 'code' property: expected string, got ${typeof event.code}`);
      }

      if (typeof event.duration !== 'number' || event.duration < 0) {
        throw new Error(`Event at index ${i} has invalid 'duration' property: expected non-negative number, got ${typeof event.duration}`);
      }

      if (typeof event.timestamp !== 'number' || event.timestamp < 0) {
        throw new Error(`Event at index ${i} has invalid 'timestamp' property: expected non-negative number, got ${typeof event.timestamp}`);
      }

      // Additional validation for empty strings
      if (event.key.trim() === '') {
        throw new Error(`Event at index ${i} has empty 'key' property`);
      }

      if (event.code.trim() === '') {
        throw new Error(`Event at index ${i} has empty 'code' property`);
      }
    }
  }

  /**
   * Dispatches a CustomEvent to simulate a keyboard interaction.
   * @param event The KeyEvent to simulate
   */
  private dispatchKeyEvent(event: KeyEvent): void {
    // Use configurable event name, default to 'keyboardHistoryReplay'
    const eventName = this.config.replayEventName || 'keyboardHistoryReplay';
    
    // Create custom event with keyboard event details
    const customEvent = new CustomEvent(eventName, {
      detail: {
        key: event.key,
        code: event.code,
        duration: event.duration,
        timestamp: event.timestamp,
        originalTimestamp: event.timestamp,
        replayTimestamp: performance.now()
      },
      bubbles: true,
      cancelable: true
    });

    // Dispatch the event on the document
    document.dispatchEvent(customEvent);
  }
}