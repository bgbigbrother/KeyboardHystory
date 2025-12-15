// Main KeyboardHistory class
// Coordinates between EventCapture and EventStore to provide the public API

import { KeyEvent, KeyboardHistoryConfig, RecordingSession } from './types';
import { EventStore } from './EventStore';
import { EventCapture } from './EventCapture';
import { EventReplay } from './EventReplay';

/**
 * KeyboardHistory is the main class that provides keyboard event recording functionality.
 * It manages recording sessions and coordinates between event capture and storage modules.
 */
export class KeyboardHistory {
  private eventStore: EventStore;
  private eventCapture: EventCapture;
  private eventReplay: EventReplay;
  private session: RecordingSession;
  private config: KeyboardHistoryConfig;

  /**
   * Creates a new KeyboardHistory instance with optional configuration.
   * @param config Optional configuration object for customizing behavior
   */
  constructor(config?: KeyboardHistoryConfig) {
    this.config = config || {};
    this.eventStore = new EventStore(this.config);
    this.eventCapture = new EventCapture(this.config);
    this.eventReplay = new EventReplay(this.config);
    
    // Initialize recording session
    this.session = {
      isRecording: false,
      startTime: null,
      events: []
    };
  }

  /**
   * Starts a new keyboard recording session.
   * If already recording, this method handles it gracefully by maintaining the current session.
   */
  start(): void {
    if (this.session.isRecording) {
      // Already recording, maintain current session
      return;
    }

    // Clear previous session data
    this.eventStore.clear();
    
    // Update session state
    this.session.isRecording = true;
    this.session.startTime = performance.now();
    this.session.events = [];

    // Start capturing events with callback to store them
    this.eventCapture.startCapture((event: KeyEvent) => {
      this.eventStore.addEvent(event);
      this.session.events.push(event);
    });
  }

  /**
   * Stops the current keyboard recording session.
   * Handles gracefully if no recording session is active.
   */
  stop(): void {
    if (!this.session.isRecording) {
      // Not currently recording, handle gracefully
      return;
    }

    // Stop capturing events
    this.eventCapture.stopCapture();

    // Update session state
    this.session.isRecording = false;
    this.session.startTime = null;
  }

  /**
   * Retrieves all recorded keyboard events from the current session.
   * @returns Array of KeyEvent objects in chronological order, or empty array if no events recorded
   */
  getRecordedKeys(): KeyEvent[] {
    return this.eventStore.getAllEvents();
  }

  /**
   * Returns whether a recording session is currently active.
   * @returns True if recording, false otherwise
   */
  isRecording(): boolean {
    return this.session.isRecording;
  }

  /**
   * Gets the current session information.
   * @returns RecordingSession object with current state
   */
  getSession(): RecordingSession {
    return {
      isRecording: this.session.isRecording,
      startTime: this.session.startTime,
      events: [...this.session.events] // Return copy to prevent external modification
    };
  }

  /**
   * Replays the recorded keyboard events by dispatching CustomEvents with original timing.
   * Uses the events stored in the EventStore and delegates to the EventReplay module.
   * @throws Error if replay is already in progress
   */
  replay(): void {
    const events = this.eventStore.getAllEvents();
    this.eventReplay.replay(events);
  }

  /**
   * Stops the current replay process if one is in progress.
   * Delegates to the EventReplay module for replay control.
   */
  stopReplay(): void {
    this.eventReplay.stopReplay();
  }

  /**
   * Returns whether a replay is currently in progress.
   * Delegates to the EventReplay module for state checking.
   * @returns True if replaying, false otherwise
   */
  isReplaying(): boolean {
    return this.eventReplay.isReplaying();
  }
}