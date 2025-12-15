import { EventCapture } from '../src/EventCapture';
import { KeyEvent } from '../src/types';
import * as fc from 'fast-check';

// Mock DOM environment for testing
const mockPerformanceNow = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

// Setup DOM mocks
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

Object.defineProperty(global, 'document', {
  value: {
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener
  },
  writable: true
});

describe('EventCapture', () => {
  let eventCapture: EventCapture;
  let capturedEvents: KeyEvent[];
  let onEventCallback: (event: KeyEvent) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedEvents = [];
    onEventCallback = (event: KeyEvent) => {
      capturedEvents.push(event);
    };
    eventCapture = new EventCapture();
  });

  describe('Property-Based Tests', () => {
    /**
     * **Feature: keyboard-history, Property 3: Event capture completeness**
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.5**
     */
    test('should capture complete event data for any valid keyboard event', () => {
      fc.assert(
        fc.property(
          fc.record({
            key: fc.constantFrom('a', 'b', 'Enter', 'Escape', 'Tab', ' '),
            code: fc.constantFrom('KeyA', 'KeyB', 'Enter', 'Escape', 'Tab', 'Space'),
            holdDuration: fc.integer({ min: 10, max: 200 })
          }),
          (testData) => {
            // Reset for each test
            capturedEvents = [];
            let timeCounter = 1000;
            mockPerformanceNow.mockImplementation(() => timeCounter);
            
            // Start capturing with session start time
            const sessionStartTime = 1000;
            eventCapture.startCapture(onEventCallback, sessionStartTime);
            
            // Get event handlers
            const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
            const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
            
            if (!keydownCall || !keyupCall) return false;
            
            const keydownHandler = keydownCall[1];
            const keyupHandler = keyupCall[1];
            
            // Simulate keydown
            keydownHandler({
              key: testData.key,
              code: testData.code,
              repeat: false
            });
            
            // Advance time
            timeCounter += testData.holdDuration;
            
            // Simulate keyup
            keyupHandler({
              key: testData.key,
              code: testData.code,
              repeat: false
            });
            
            eventCapture.stopCapture();
            
            // Validate captured event
            if (capturedEvents.length !== 1) return false;
            
            const event = capturedEvents[0];
            
            // Requirements validation
            const hasValidKey = typeof event.key === 'string' && event.key.length > 0;
            const hasValidDuration = typeof event.duration === 'number' && event.duration >= 0;
            const hasValidTimestamp = typeof event.timestamp === 'number' && event.timestamp >= 0;
            const hasValidCode = typeof event.code === 'string' && event.code.length > 0;
            
            return hasValidKey && hasValidDuration && hasValidTimestamp && hasValidCode;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: keyboard-history, Property 6: Rapid event handling**
     * **Validates: Requirements 6.1**
     */
    test('should capture all events during rapid key presses without data loss', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.constantFrom('a', 'b', 'c', 'd', 'e', 'Enter', 'Space'),
              code: fc.constantFrom('KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'Enter', 'Space'),
              holdDuration: fc.integer({ min: 5, max: 50 }) // Short durations for rapid events
            }),
            { minLength: 3, maxLength: 20 } // Test with multiple rapid events
          ),
          (rapidEvents) => {
            // Reset for each test
            capturedEvents = [];
            let timeCounter = 1000;
            mockPerformanceNow.mockImplementation(() => timeCounter);
            
            // Start capturing with session start time
            const sessionStartTime = 1000;
            eventCapture.startCapture(onEventCallback, sessionStartTime);
            
            // Get event handlers
            const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
            const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
            
            if (!keydownCall || !keyupCall) return false;
            
            const keydownHandler = keydownCall[1];
            const keyupHandler = keyupCall[1];
            
            // Simulate rapid sequence of key events
            for (const eventData of rapidEvents) {
              // Keydown
              keydownHandler({
                key: eventData.key,
                code: eventData.code,
                repeat: false
              });
              
              // Advance time by hold duration
              timeCounter += eventData.holdDuration;
              
              // Keyup
              keyupHandler({
                key: eventData.key,
                code: eventData.code,
                repeat: false
              });
              
              // Small gap between events (1-5ms) to simulate rapid typing
              timeCounter += fc.sample(fc.integer({ min: 1, max: 5 }), 1)[0];
            }
            
            eventCapture.stopCapture();
            
            // Validate that all events were captured without data loss
            if (capturedEvents.length !== rapidEvents.length) {
              return false;
            }
            
            // Verify each captured event has valid properties
            for (let i = 0; i < capturedEvents.length; i++) {
              const capturedEvent = capturedEvents[i];
              const originalEvent = rapidEvents[i];
              
              // Check that event has required properties
              if (typeof capturedEvent.key !== 'string' || capturedEvent.key.length === 0) {
                return false;
              }
              if (typeof capturedEvent.duration !== 'number' || capturedEvent.duration < 0) {
                return false;
              }
              if (typeof capturedEvent.timestamp !== 'number' || capturedEvent.timestamp < 0) {
                return false;
              }
              if (typeof capturedEvent.code !== 'string' || capturedEvent.code.length === 0) {
                return false;
              }
              
              // Verify the captured event matches the original event data
              if (capturedEvent.key !== originalEvent.key && capturedEvent.code !== originalEvent.code) {
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

  describe('Basic Functionality', () => {
    test('should start and stop capturing correctly', () => {
      expect(eventCapture.isCurrentlyCapturing()).toBe(false);
      
      eventCapture.startCapture(onEventCallback, 1000);
      expect(eventCapture.isCurrentlyCapturing()).toBe(true);
      expect(mockAddEventListener).toHaveBeenCalledTimes(2);
      
      eventCapture.stopCapture();
      expect(eventCapture.isCurrentlyCapturing()).toBe(false);
      expect(mockRemoveEventListener).toHaveBeenCalledTimes(2);
    });

    test('should handle multiple start calls gracefully', () => {
      eventCapture.startCapture(onEventCallback, 1000);
      eventCapture.startCapture(onEventCallback, 1000);
      
      expect(mockAddEventListener).toHaveBeenCalledTimes(2); // Should only register once
    });

    test('should handle stop without start gracefully', () => {
      eventCapture.stopCapture();
      expect(mockRemoveEventListener).not.toHaveBeenCalled();
    });
  });

  describe('Special Key Handling', () => {
    beforeEach(() => {
      let timeCounter = 1000;
      mockPerformanceNow.mockImplementation(() => timeCounter++);
    });

    test('should capture Enter key with correct identifier', () => {
      eventCapture.startCapture(onEventCallback, 1000);
      
      const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
      const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
      
      const keydownHandler = keydownCall![1];
      const keyupHandler = keyupCall![1];
      
      // Simulate Enter key press
      keydownHandler({ key: 'Enter', code: 'Enter', repeat: false });
      keyupHandler({ key: 'Enter', code: 'Enter', repeat: false });
      
      eventCapture.stopCapture();
      
      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0].key).toBe('Enter');
      expect(capturedEvents[0].code).toBe('Enter');
    });

    test('should capture Shift key with correct identifier', () => {
      eventCapture.startCapture(onEventCallback, 1000);
      
      const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
      const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
      
      const keydownHandler = keydownCall![1];
      const keyupHandler = keyupCall![1];
      
      // Simulate Shift key press
      keydownHandler({ key: 'Shift', code: 'ShiftLeft', repeat: false });
      keyupHandler({ key: 'Shift', code: 'ShiftLeft', repeat: false });
      
      eventCapture.stopCapture();
      
      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0].key).toBe('Shift');
      expect(capturedEvents[0].code).toBe('ShiftLeft');
    });

    test('should capture Ctrl key with correct identifier', () => {
      eventCapture.startCapture(onEventCallback, 1000);
      
      const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
      const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
      
      const keydownHandler = keydownCall![1];
      const keyupHandler = keyupCall![1];
      
      // Simulate Ctrl key press
      keydownHandler({ key: 'Control', code: 'ControlLeft', repeat: false });
      keyupHandler({ key: 'Control', code: 'ControlLeft', repeat: false });
      
      eventCapture.stopCapture();
      
      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0].key).toBe('Control');
      expect(capturedEvents[0].code).toBe('ControlLeft');
    });

    test('should capture Alt key with correct identifier', () => {
      eventCapture.startCapture(onEventCallback, 1000);
      
      const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
      const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
      
      const keydownHandler = keydownCall![1];
      const keyupHandler = keyupCall![1];
      
      // Simulate Alt key press
      keydownHandler({ key: 'Alt', code: 'AltLeft', repeat: false });
      keyupHandler({ key: 'Alt', code: 'AltLeft', repeat: false });
      
      eventCapture.stopCapture();
      
      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0].key).toBe('Alt');
      expect(capturedEvents[0].code).toBe('AltLeft');
    });

    test('should capture Space key with correct identifier', () => {
      eventCapture.startCapture(onEventCallback, 1000);
      
      const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
      const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
      
      const keydownHandler = keydownCall![1];
      const keyupHandler = keyupCall![1];
      
      // Simulate Space key press
      keydownHandler({ key: ' ', code: 'Space', repeat: false });
      keyupHandler({ key: ' ', code: 'Space', repeat: false });
      
      eventCapture.stopCapture();
      
      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0].key).toBe(' ');
      expect(capturedEvents[0].code).toBe('Space');
    });

    test('should capture Escape key with correct identifier', () => {
      eventCapture.startCapture(onEventCallback, 1000);
      
      const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
      const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
      
      const keydownHandler = keydownCall![1];
      const keyupHandler = keyupCall![1];
      
      // Simulate Escape key press
      keydownHandler({ key: 'Escape', code: 'Escape', repeat: false });
      keyupHandler({ key: 'Escape', code: 'Escape', repeat: false });
      
      eventCapture.stopCapture();
      
      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0].key).toBe('Escape');
      expect(capturedEvents[0].code).toBe('Escape');
    });

    test('should capture Tab key with correct identifier', () => {
      eventCapture.startCapture(onEventCallback, 1000);
      
      const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
      const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
      
      const keydownHandler = keydownCall![1];
      const keyupHandler = keyupCall![1];
      
      // Simulate Tab key press
      keydownHandler({ key: 'Tab', code: 'Tab', repeat: false });
      keyupHandler({ key: 'Tab', code: 'Tab', repeat: false });
      
      eventCapture.stopCapture();
      
      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0].key).toBe('Tab');
      expect(capturedEvents[0].code).toBe('Tab');
    });

    test('should capture Backspace key with correct identifier', () => {
      eventCapture.startCapture(onEventCallback, 1000);
      
      const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
      const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
      
      const keydownHandler = keydownCall![1];
      const keyupHandler = keyupCall![1];
      
      // Simulate Backspace key press
      keydownHandler({ key: 'Backspace', code: 'Backspace', repeat: false });
      keyupHandler({ key: 'Backspace', code: 'Backspace', repeat: false });
      
      eventCapture.stopCapture();
      
      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0].key).toBe('Backspace');
      expect(capturedEvents[0].code).toBe('Backspace');
    });

    test('should capture Delete key with correct identifier', () => {
      eventCapture.startCapture(onEventCallback, 1000);
      
      const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
      const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
      
      const keydownHandler = keydownCall![1];
      const keyupHandler = keyupCall![1];
      
      // Simulate Delete key press
      keydownHandler({ key: 'Delete', code: 'Delete', repeat: false });
      keyupHandler({ key: 'Delete', code: 'Delete', repeat: false });
      
      eventCapture.stopCapture();
      
      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0].key).toBe('Delete');
      expect(capturedEvents[0].code).toBe('Delete');
    });
  });

  describe('Key Repeat Event Handling', () => {
    beforeEach(() => {
      let timeCounter = 1000;
      mockPerformanceNow.mockImplementation(() => timeCounter++);
    });

    test('should capture key repeat events when captureRepeats is enabled (default)', () => {
      eventCapture.startCapture(onEventCallback, 1000);
      
      const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
      const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
      
      const keydownHandler = keydownCall![1];
      const keyupHandler = keyupCall![1];
      
      // Simulate initial key press
      keydownHandler({ key: 'a', code: 'KeyA', repeat: false });
      
      // Simulate key repeat events
      keydownHandler({ key: 'a', code: 'KeyA', repeat: true });
      keydownHandler({ key: 'a', code: 'KeyA', repeat: true });
      
      // Simulate key release
      keyupHandler({ key: 'a', code: 'KeyA', repeat: false });
      
      eventCapture.stopCapture();
      
      // Should capture one event for the final keyup
      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0].key).toBe('a');
    });

    test('should not capture key repeat events when captureRepeats is disabled', () => {
      const eventCaptureNoRepeats = new EventCapture({ captureRepeats: false });
      eventCaptureNoRepeats.startCapture(onEventCallback, 1000);
      
      const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
      const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
      
      const keydownHandler = keydownCall![1];
      const keyupHandler = keyupCall![1];
      
      // Simulate initial key press
      keydownHandler({ key: 'a', code: 'KeyA', repeat: false });
      
      // Simulate key repeat events (should be ignored)
      keydownHandler({ key: 'a', code: 'KeyA', repeat: true });
      keydownHandler({ key: 'a', code: 'KeyA', repeat: true });
      
      // Simulate key release
      keyupHandler({ key: 'a', code: 'KeyA', repeat: false });
      
      eventCaptureNoRepeats.stopCapture();
      
      // Should still capture one event for the keyup
      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0].key).toBe('a');
    });
  });

  describe('Focus/Blur Scenarios', () => {
    beforeEach(() => {
      let timeCounter = 1000;
      mockPerformanceNow.mockImplementation(() => timeCounter++);
    });

    test('should handle keydown without corresponding keyup gracefully', () => {
      eventCapture.startCapture(onEventCallback, 1000);
      
      const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
      const keydownHandler = keydownCall![1];
      
      // Simulate keydown but no keyup (e.g., user switches tabs while key is held)
      keydownHandler({ key: 'a', code: 'KeyA', repeat: false });
      
      // Stop capture without keyup
      eventCapture.stopCapture();
      
      // Should not have captured any events since no keyup occurred
      expect(capturedEvents).toHaveLength(0);
    });

    test('should handle keyup without corresponding keydown gracefully', () => {
      eventCapture.startCapture(onEventCallback, 1000);
      
      const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
      const keyupHandler = keyupCall![1];
      
      // Simulate keyup without keydown (e.g., key was pressed before capture started)
      keyupHandler({ key: 'a', code: 'KeyA', repeat: false });
      
      eventCapture.stopCapture();
      
      // Should not have captured any events since no corresponding keydown
      expect(capturedEvents).toHaveLength(0);
    });

    test('should clear pending keydown events when stopping capture', () => {
      eventCapture.startCapture(onEventCallback, 1000);
      
      const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
      const keydownHandler = keydownCall![1];
      
      // Simulate keydown
      keydownHandler({ key: 'a', code: 'KeyA', repeat: false });
      
      // Stop capture (simulating focus loss)
      eventCapture.stopCapture();
      
      // Start capture again
      eventCapture.startCapture(onEventCallback, 1000);
      
      const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
      const keyupHandler = keyupCall![1];
      
      // Simulate keyup for the previously pressed key
      keyupHandler({ key: 'a', code: 'KeyA', repeat: false });
      
      eventCapture.stopCapture();
      
      // Should not capture the orphaned keyup event
      expect(capturedEvents).toHaveLength(0);
    });

    test('should handle multiple keys pressed during focus loss scenario', () => {
      eventCapture.startCapture(onEventCallback, 1000);
      
      const keydownCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keydown');
      const keyupCall = mockAddEventListener.mock.calls.find(call => call[0] === 'keyup');
      
      const keydownHandler = keydownCall![1];
      const keyupHandler = keyupCall![1];
      
      // Simulate multiple keys pressed
      keydownHandler({ key: 'a', code: 'KeyA', repeat: false });
      keydownHandler({ key: 'b', code: 'KeyB', repeat: false });
      keydownHandler({ key: 'c', code: 'KeyC', repeat: false });
      
      // Simulate only one key released before focus loss
      keyupHandler({ key: 'a', code: 'KeyA', repeat: false });
      
      // Stop capture (simulating focus loss)
      eventCapture.stopCapture();
      
      // Should have captured only the one complete key event
      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0].key).toBe('a');
    });
  });
});