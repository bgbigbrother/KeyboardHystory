import { KeyEvent, KeyboardHistoryConfig } from './types';

/**
 * EventCapture handles DOM keyboard event management for the KeyboardHistory library.
 * Manages event listeners, calculates key press durations, and generates normalized key events
 * with session-relative timestamps (0-based from session start time).
 */
export class EventCapture {
  private isCapturing: boolean = false;
  private keyDownTimes: Map<string, number> = new Map();
  private captureRepeats: boolean;
  private timestampPrecision: number;
  private onEventCallback?: (event: KeyEvent) => void;
  private sessionStartTime: number = 0;

  constructor(config?: KeyboardHistoryConfig) {
    this.captureRepeats = config?.captureRepeats ?? true;
    this.timestampPrecision = config?.timestampPrecision ?? 3;
  }

  /**
   * Starts capturing keyboard events by attaching event listeners to the document.
   * @param onEvent Callback function to handle captured KeyEvent objects
   * @param sessionStartTime The timestamp when the recording session started (for calculating session-relative timestamps)
   */
  startCapture(onEvent: (event: KeyEvent) => void, sessionStartTime: number): void {
    if (this.isCapturing) {
      return; // Already capturing
    }

    this.onEventCallback = onEvent;
    this.isCapturing = true;
    this.sessionStartTime = sessionStartTime;
    this.keyDownTimes.clear();

    // Attach event listeners to document for global keyboard capture
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('keyup', this.handleKeyUp, true);
  }

  /**
   * Stops capturing keyboard events by removing event listeners.
   */
  stopCapture(): void {
    if (!this.isCapturing) {
      return; // Not currently capturing
    }

    this.isCapturing = false;
    this.keyDownTimes.clear();
    this.onEventCallback = undefined;

    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown, true);
    document.removeEventListener('keyup', this.handleKeyUp, true);
  }

  /**
   * Returns whether the EventCapture is currently capturing events.
   */
  isCurrentlyCapturing(): boolean {
    return this.isCapturing;
  }

  /**
   * Handles keydown events by recording the timestamp when a key is pressed.
   * @param event The DOM KeyboardEvent
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isCapturing || !this.onEventCallback) {
      return;
    }

    const keyIdentifier = this.normalizeKeyIdentifier(event.key, event.code);
    
    // Handle key repeat events based on configuration
    if (!this.captureRepeats && event.repeat) {
      return;
    }

    // Record the time when the key was pressed
    // Use a combination of key and code to handle cases where multiple keys might have the same identifier
    const keyMapId = `${keyIdentifier}-${event.code}`;
    
    if (!this.keyDownTimes.has(keyMapId) || this.captureRepeats) {
      this.keyDownTimes.set(keyMapId, performance.now());
    }
  };

  /**
   * Handles keyup events by calculating duration and creating KeyEvent objects.
   * @param event The DOM KeyboardEvent
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    if (!this.isCapturing || !this.onEventCallback) {
      return;
    }

    const keyIdentifier = this.normalizeKeyIdentifier(event.key, event.code);
    const keyMapId = `${keyIdentifier}-${event.code}`;
    const keyDownTime = this.keyDownTimes.get(keyMapId);

    if (keyDownTime === undefined) {
      // Key was pressed before capture started, ignore
      return;
    }

    const keyUpTime = performance.now();
    const duration = this.roundToPrecision(keyUpTime - keyDownTime, this.timestampPrecision);
    // Calculate session-relative timestamp (milliseconds from session start)
    const sessionRelativeTimestamp = this.roundToPrecision(keyDownTime - this.sessionStartTime, this.timestampPrecision);

    // Create the KeyEvent object
    const keyEvent: KeyEvent = {
      key: keyIdentifier,
      duration: duration,
      timestamp: sessionRelativeTimestamp,
      code: event.code
    };

    // Remove the key from tracking map
    this.keyDownTimes.delete(keyMapId);

    // Send the event to the callback
    this.onEventCallback(keyEvent);
  };

  /**
   * Normalizes key identifiers to ensure consistency across different browsers and scenarios.
   * @param key The key property from KeyboardEvent
   * @param code The code property from KeyboardEvent
   * @returns Normalized key identifier
   */
  private normalizeKeyIdentifier(key: string, code: string): string {
    // Handle special cases where key might be inconsistent
    switch (code) {
      case 'Space':
        return ' ';
      case 'Enter':
        return 'Enter';
      case 'Tab':
        return 'Tab';
      case 'Escape':
        return 'Escape';
      case 'Backspace':
        return 'Backspace';
      case 'Delete':
        return 'Delete';
      default:
        // For most keys, use the key property as it represents the actual character
        // Fall back to code if key is not available or is a special value
        if (key && key !== 'Unidentified' && key.length > 0) {
          return key;
        }
        return code;
    }
  }

  /**
   * Rounds a number to the specified number of decimal places.
   * @param value The number to round
   * @param precision Number of decimal places
   * @returns Rounded number
   */
  private roundToPrecision(value: number, precision: number): number {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }
}