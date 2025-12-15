// Type definitions for KeyboardHistory library
// These will be implemented in task 2.1

export interface KeyEvent {
  key: string;           // Key identifier (e.g., 'a', 'Enter', 'Shift')
  duration: number;      // Time held in milliseconds
  timestamp: number;     // Unix timestamp when key was pressed
  code: string;          // Physical key code (e.g., 'KeyA', 'Enter')
}

export interface RecordingSession {
  isRecording: boolean;
  startTime: number | null;
  events: KeyEvent[];
}

export interface KeyboardHistoryConfig {
  maxEvents?: number;           // Maximum events to store (default: 10000)
  captureRepeats?: boolean;     // Capture key repeat events (default: true)
  timestampPrecision?: number;  // Decimal places for timestamps (default: 3)
}