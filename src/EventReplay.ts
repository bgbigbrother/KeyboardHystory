import { KeyEvent, KeyboardHistoryConfig, ReplaySession } from './types';

/**
 * EventReplay manages the simulation of recorded keyboard events.
 * It dispatches CustomEvents with proper timing to recreate the original keyboard interactions.
 */
export class EventReplay {
  private replaySession: ReplaySession;
  private config: KeyboardHistoryConfig;

  constructor(config?: KeyboardHistoryConfig) {
    this.config = config || {};
    this.replaySession = {
      isReplaying: false,
      currentIndex: 0,
      startTime: null,
      timeoutIds: []
    };
  }

  /**
   * Replays a sequence of recorded keyboard events by dispatching CustomEvents
   * with the original timing intervals between events.
   * @param events Array of KeyEvent objects to replay
   * @throws Error if replay is already in progress or events array is invalid
   */
  replay(events: KeyEvent[]): void {
    if (this.replaySession.isReplaying) {
      throw new Error('Replay is already in progress. Call stopReplay() first.');
    }

    if (!Array.isArray(events)) {
      throw new Error('Events must be an array');
    }

    // Handle empty events array gracefully
    if (events.length === 0) {
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
    this.scheduleNextEvent(events, 0);
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

    // Calculate delay based on timing relative to first event
    if (eventIndex > 0 && this.replaySession.startTime !== null) {
      const firstEventTime = events[0].timestamp;
      const currentEventTime = currentEvent.timestamp;
      const expectedDelay = currentEventTime - firstEventTime;
      const elapsedTime = performance.now() - this.replaySession.startTime;
      delay = Math.max(0, expectedDelay - elapsedTime);
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