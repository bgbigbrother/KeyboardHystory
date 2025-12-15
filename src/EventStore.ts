import { KeyEvent, KeyboardHistoryConfig } from './types';

/**
 * EventStore manages in-memory storage of keyboard events during recording sessions.
 * Provides methods for adding events, retrieving all events, and managing memory limits.
 */
export class EventStore {
  private events: KeyEvent[] = [];
  private maxEvents: number;

  constructor(config?: KeyboardHistoryConfig) {
    this.maxEvents = config?.maxEvents ?? 10000;
  }

  /**
   * Adds a new KeyEvent to the store after validation.
   * Manages memory by removing oldest events if maxEvents limit is exceeded.
   * @param event The KeyEvent to add
   * @throws Error if event validation fails
   */
  addEvent(event: KeyEvent): void {
    this.validateEvent(event);
    
    this.events.push(event);
    
    // Memory management: remove oldest events if limit exceeded
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  /**
   * Retrieves all stored events in chronological order.
   * @returns Array of KeyEvent objects
   */
  getAllEvents(): KeyEvent[] {
    return [...this.events]; // Return a copy to prevent external modification
  }

  /**
   * Clears all stored events from memory.
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Returns the current number of stored events.
   * @returns Number of events in storage
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Validates a KeyEvent object to ensure it has all required properties
   * with correct types and reasonable values.
   * @param event The KeyEvent to validate
   * @throws Error if validation fails
   */
  private validateEvent(event: KeyEvent): void {
    if (!event || typeof event !== 'object') {
      throw new Error('Event must be a valid object');
    }

    if (typeof event.key !== 'string' || event.key.length === 0) {
      throw new Error('Event key must be a non-empty string');
    }

    if (typeof event.code !== 'string' || event.code.length === 0) {
      throw new Error('Event code must be a non-empty string');
    }

    if (typeof event.duration !== 'number' || event.duration < 0) {
      throw new Error('Event duration must be a non-negative number');
    }

    if (typeof event.timestamp !== 'number' || event.timestamp <= 0) {
      throw new Error('Event timestamp must be a positive number');
    }
  }
}