# KeyboardHistory

A lightweight, browser-based npm package that captures and stores detailed keyboard interaction data including key presses, duration, and precise timestamps. Perfect for analytics, debugging, user experience research, and input behavior analysis.

## Features

- 🎯 **Real-time keyboard event capture** - Records key presses with millisecond precision
- ⏱️ **Duration tracking** - Measures how long each key is held down
- 📊 **Detailed event data** - Captures key identifiers, physical key codes, and timestamps
- 🔧 **Configurable** - Customizable event limits, repeat handling, and precision settings
- 🚀 **Lightweight** - Zero dependencies, minimal footprint
- 🌐 **Browser-focused** - Designed specifically for web applications
- 📦 **TypeScript support** - Full type definitions included

## Installation

```bash
npm install keyboard-history
```

## Quick Start

```typescript
import { KeyboardHistory } from 'keyboard-history';

// Create instance with default settings
const keyboardHistory = new KeyboardHistory();

// Start recording keyboard events
keyboardHistory.start();

// ... user types on keyboard ...

// Stop recording
keyboardHistory.stop();

// Get all recorded events
const events = keyboardHistory.getRecordedKeys();
console.log(events);
// Output: [
//   { key: 'h', duration: 120, timestamp: 1634567890123, code: 'KeyH' },
//   { key: 'e', duration: 95, timestamp: 1634567890245, code: 'KeyE' },
//   { key: 'l', duration: 110, timestamp: 1634567890356, code: 'KeyL' },
//   ...
// ]
```

## Configuration

```typescript
import { KeyboardHistory } from 'keyboard-history';

const keyboardHistory = new KeyboardHistory({
  maxEvents: 5000,          // Maximum events to store (default: 10000)
  captureRepeats: false,    // Capture key repeat events (default: true)
  timestampPrecision: 2     // Decimal places for timestamps (default: 3)
});
```

## API Documentation

### Constructor

#### `new KeyboardHistory(config?: KeyboardHistoryConfig)`

Creates a new KeyboardHistory instance.

**Parameters:**
- `config` (optional): Configuration object

**Configuration Options:**
- `maxEvents?: number` - Maximum number of events to store (default: 10000)
- `captureRepeats?: boolean` - Whether to capture key repeat events (default: true)
- `timestampPrecision?: number` - Decimal places for timestamps (default: 3)

### Methods

#### `start(): void`

Starts a new keyboard recording session. If already recording, maintains the current session gracefully.

```typescript
keyboardHistory.start();
```

#### `stop(): void`

Stops the current recording session. Handles gracefully if no session is active.

```typescript
keyboardHistory.stop();
```

#### `getRecordedKeys(): KeyEvent[]`

Returns all recorded keyboard events from the current session in chronological order.

```typescript
const events = keyboardHistory.getRecordedKeys();
```

**Returns:** Array of `KeyEvent` objects

#### `isRecording(): boolean`

Returns whether a recording session is currently active.

```typescript
if (keyboardHistory.isRecording()) {
  console.log('Currently recording...');
}
```

#### `getSession(): RecordingSession`

Gets the current session information including state and events.

```typescript
const session = keyboardHistory.getSession();
console.log('Recording:', session.isRecording);
console.log('Start time:', session.startTime);
console.log('Events count:', session.events.length);
```

### Types

#### `KeyEvent`

```typescript
interface KeyEvent {
  key: string;        // Key identifier (e.g., 'a', 'Enter', 'Shift')
  duration: number;   // Time held in milliseconds
  timestamp: number;  // Unix timestamp when key was pressed
  code: string;       // Physical key code (e.g., 'KeyA', 'Enter')
}
```

#### `RecordingSession`

```typescript
interface RecordingSession {
  isRecording: boolean;
  startTime: number | null;
  events: KeyEvent[];
}
```

#### `KeyboardHistoryConfig`

```typescript
interface KeyboardHistoryConfig {
  maxEvents?: number;
  captureRepeats?: boolean;
  timestampPrecision?: number;
}
```

## Usage Examples

### Basic Recording Session

```typescript
import { KeyboardHistory } from 'keyboard-history';

const recorder = new KeyboardHistory();

// Start recording
recorder.start();

// Let user type for a while...
setTimeout(() => {
  // Stop and analyze
  recorder.stop();
  
  const events = recorder.getRecordedKeys();
  console.log(`Captured ${events.length} key events`);
  
  // Calculate average key press duration
  const avgDuration = events.reduce((sum, e) => sum + e.duration, 0) / events.length;
  console.log(`Average key press duration: ${avgDuration.toFixed(1)}ms`);
}, 10000);
```

### Analyzing Typing Patterns

```typescript
import { KeyboardHistory } from 'keyboard-history';

const recorder = new KeyboardHistory({ maxEvents: 1000 });

recorder.start();

// After some typing...
recorder.stop();

const events = recorder.getRecordedKeys();

// Find most frequently pressed keys
const keyFrequency = events.reduce((freq, event) => {
  freq[event.key] = (freq[event.key] || 0) + 1;
  return freq;
}, {} as Record<string, number>);

console.log('Key frequency:', keyFrequency);

// Find longest key press
const longestPress = events.reduce((max, event) => 
  event.duration > max.duration ? event : max
);

console.log('Longest key press:', longestPress);
```

### Real-time Event Processing

```typescript
import { KeyboardHistory } from 'keyboard-history';

const recorder = new KeyboardHistory();

recorder.start();

// Check for new events periodically
setInterval(() => {
  const events = recorder.getRecordedKeys();
  const recentEvents = events.slice(-5); // Last 5 events
  
  console.log('Recent keys:', recentEvents.map(e => e.key).join(''));
}, 1000);
```

### Export Data for Analysis

```typescript
import { KeyboardHistory } from 'keyboard-history';

const recorder = new KeyboardHistory();

recorder.start();

// After recording session...
recorder.stop();

const session = recorder.getSession();
const events = recorder.getRecordedKeys();

const exportData = {
  metadata: {
    exportTime: new Date().toISOString(),
    totalEvents: events.length,
    sessionStartTime: session.startTime,
    recordingDuration: session.startTime ? performance.now() - session.startTime : 0
  },
  events: events
};

// Convert to JSON for export
const jsonData = JSON.stringify(exportData, null, 2);
console.log('Export data:', jsonData);
```

## Demo Page

The package includes an interactive demo page that showcases all library features:

### Running the Demo

```bash
# Clone the repository
git clone https://github.com/bgbigbrother/KeyboardHystory.git
cd keyboard-history

# Install dependencies
npm install

# Start the demo server
npm run demo
```

The demo page provides:
- **Start/Stop Controls** - Begin and end recording sessions
- **Real-time Display** - See captured events as you type
- **Statistics** - View event count, session duration, and average key press duration
- **Export Functionality** - Download recorded data as JSON
- **Visual Feedback** - Clear indication of recording state

### Demo Features

- Interactive keyboard event capture
- Real-time event display with formatting for special keys
- Session statistics and analytics
- JSON export with metadata
- Responsive design with clean UI
- Error handling and user notifications

## Browser Compatibility

KeyboardHistory is compatible with modern browsers that support:

- **ES6+ JavaScript** (ES2015 and later)
- **DOM Event Handling** (`addEventListener`, `removeEventListener`)
- **Performance API** (`performance.now()` for high-precision timestamps)
- **Keyboard Events** (`keydown`, `keyup` events)

### Supported Browsers

| Browser | Minimum Version |
|---------|----------------|
| Chrome  | 49+ |
| Firefox | 45+ |
| Safari  | 10+ |
| Edge    | 14+ |

### Feature Detection

The library includes built-in feature detection and will gracefully handle unsupported environments:

```typescript
// The library will automatically detect and adapt to browser capabilities
const recorder = new KeyboardHistory();

if (recorder.isRecording !== undefined) {
  // Browser supports all required features
  recorder.start();
} else {
  console.warn('KeyboardHistory not fully supported in this browser');
}
```

## Development

### Setup

```bash
# Clone repository
git clone https://github.com/bgbigbrother/KeyboardHystory.git
cd keyboard-history

# Install dependencies
npm install
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server with demo
npm run demo         # Start demo page only

# Building
npm run build        # Build library for production
npm run build:lib    # Build library only
npm run build:types  # Generate TypeScript declarations
npm run build:clean  # Clean build directory

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Quality
npm run lint         # Type checking with TypeScript
```

### Project Structure

```
keyboard-history/
├── src/                 # Source code
│   ├── KeyboardHistory.ts   # Main class
│   ├── EventCapture.ts      # Event capture module
│   ├── EventStore.ts        # Data storage module
│   ├── types.ts             # TypeScript definitions
│   └── index.ts             # Library entry point
├── test/                # Test files
├── demo/                # Demo page
├── dist/                # Built library (generated)
└── docs/                # Documentation
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/bgbigbrother/KeyboardHystory#readme)
- 🐛 [Issue Tracker](https://github.com/bgbigbrother/KeyboardHystory/issues)
- 💬 [Discussions](https://github.com/bgbigbrother/KeyboardHystory/discussions)

---

Made with ❤️ for the web development community