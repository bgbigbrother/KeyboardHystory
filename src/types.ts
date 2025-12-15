// Type definitions for KeyboardHistory library
// These will be implemented in task 2.1

export interface KeyEvent {
  key: string;           // Key identifier (e.g., 'a', 'Enter', 'Shift')
  duration: number;      // Time held in milliseconds
  timestamp: number;     // Time in milliseconds relative to session start (0-based) when key was initially pressed
  code: string;          // Physical key code (e.g., 'KeyA', 'Enter')
}

export interface RecordingSession {
  isRecording: boolean;
  startTime: number | null;
  events: KeyEvent[];
}

export interface ReplaySession {
  isReplaying: boolean;
  currentIndex: number;
  startTime: number | null;
  timeoutIds: ReturnType<typeof setTimeout>[];
}

export interface KeyboardHistoryConfig {
  maxEvents?: number;           // Maximum events to store (default: 10000)
  captureRepeats?: boolean;     // Capture key repeat events (default: true)
  timestampPrecision?: number;  // Decimal places for session-relative timestamps (default: 3)
  replayEventName?: string;     // Custom event name for replay (default: 'keyboardHistoryReplay')
}