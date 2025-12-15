// Demo page TypeScript entry point
import { KeyboardHistory } from '../src/KeyboardHistory';
import type { KeyEvent } from '../src/types';

class KeyboardHistoryDemo {
  private keyboardHistory: KeyboardHistory;
  private sessionStartTime: number | null = null;
  private updateInterval: number | null = null;
  private eventUpdateQueue: KeyEvent[] = [];

  // DOM elements
  private startBtn: HTMLButtonElement;
  private stopBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private statusIndicator: HTMLElement;
  private statusText: HTMLElement;
  private eventCount: HTMLElement;
  private sessionDuration: HTMLElement;
  private avgDuration: HTMLElement;
  private eventsList: HTMLElement;
  private eventsInfo: HTMLElement;

  constructor() {
    this.keyboardHistory = new KeyboardHistory({
      maxEvents: 1000,
      captureRepeats: true,
      timestampPrecision: 3
    });

    this.initializeElements();
    this.bindEvents();
    this.updateUI();
  }

  private initializeElements(): void {
    this.startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    this.stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    this.exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
    this.clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    this.statusIndicator = document.getElementById('statusIndicator') as HTMLElement;
    this.statusText = document.getElementById('statusText') as HTMLElement;
    this.eventCount = document.getElementById('eventCount') as HTMLElement;
    this.sessionDuration = document.getElementById('sessionDuration') as HTMLElement;
    this.avgDuration = document.getElementById('avgDuration') as HTMLElement;
    this.eventsList = document.getElementById('eventsList') as HTMLElement;
    this.eventsInfo = document.getElementById('eventsInfo') as HTMLElement;

    if (!this.startBtn || !this.stopBtn || !this.exportBtn || !this.clearBtn ||
        !this.statusIndicator || !this.statusText || !this.eventCount ||
        !this.sessionDuration || !this.avgDuration || !this.eventsList || !this.eventsInfo) {
      throw new Error('Required DOM elements not found');
    }
  }

  private bindEvents(): void {
    this.startBtn.addEventListener('click', () => this.startRecording());
    this.stopBtn.addEventListener('click', () => this.stopRecording());
    this.exportBtn.addEventListener('click', () => this.exportData());
    this.clearBtn.addEventListener('click', () => this.clearEvents());

    // Listen for keyboard events to update display in real-time
    document.addEventListener('keydown', () => {
      if (this.keyboardHistory.isRecording()) {
        // Small delay to allow the KeyboardHistory to process the event first
        setTimeout(() => this.updateEventDisplay(), 10);
      }
    });
  }

  private startRecording(): void {
    try {
      this.keyboardHistory.start();
      this.sessionStartTime = performance.now();
      
      // Start updating session duration
      this.updateInterval = window.setInterval(() => {
        this.updateSessionDuration();
      }, 100);

      this.updateUI();
      this.showNotification('Recording started! Type on your keyboard to capture events.', 'success');
    } catch (error) {
      this.showNotification('Failed to start recording: ' + (error as Error).message, 'error');
    }
  }

  private stopRecording(): void {
    try {
      this.keyboardHistory.stop();
      this.sessionStartTime = null;
      
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      this.updateUI();
      this.updateEventDisplay();
      
      const events = this.keyboardHistory.getRecordedKeys();
      this.showNotification(`Recording stopped! Captured ${events.length} events.`, 'success');
    } catch (error) {
      this.showNotification('Failed to stop recording: ' + (error as Error).message, 'error');
    }
  }

  private exportData(): void {
    try {
      const events = this.keyboardHistory.getRecordedKeys();
      const session = this.keyboardHistory.getSession();
      
      const exportData = {
        metadata: {
          exportTime: new Date().toISOString(),
          totalEvents: events.length,
          sessionStartTime: session.startTime,
          recordingDuration: session.startTime ? performance.now() - session.startTime : 0
        },
        events: events
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `keyboard-history-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(link.href);
      
      this.showNotification(`Exported ${events.length} events to JSON file.`, 'success');
    } catch (error) {
      this.showNotification('Failed to export data: ' + (error as Error).message, 'error');
    }
  }

  private clearEvents(): void {
    // Stop recording if active
    if (this.keyboardHistory.isRecording()) {
      this.stopRecording();
    }

    // Create new instance to clear all data
    this.keyboardHistory = new KeyboardHistory({
      maxEvents: 1000,
      captureRepeats: true,
      timestampPrecision: 3
    });

    this.updateUI();
    this.updateEventDisplay();
    this.showNotification('All events cleared.', 'success');
  }

  private updateUI(): void {
    const isRecording = this.keyboardHistory.isRecording();
    const events = this.keyboardHistory.getRecordedKeys();

    // Update button states
    this.startBtn.disabled = isRecording;
    this.stopBtn.disabled = !isRecording;
    this.exportBtn.disabled = events.length === 0;

    // Update status indicator
    this.statusIndicator.classList.toggle('recording', isRecording);
    this.statusText.textContent = isRecording ? 'Recording...' : 'Not Recording';

    // Update event count
    this.eventCount.textContent = events.length.toString();

    // Update average duration
    if (events.length > 0) {
      const totalDuration = events.reduce((sum, event) => sum + event.duration, 0);
      const avgDur = totalDuration / events.length;
      this.avgDuration.textContent = `${avgDur.toFixed(1)}ms`;
    } else {
      this.avgDuration.textContent = '0ms';
    }

    // Update session duration
    this.updateSessionDuration();
  }

  private updateSessionDuration(): void {
    if (this.sessionStartTime && this.keyboardHistory.isRecording()) {
      const duration = (performance.now() - this.sessionStartTime) / 1000;
      this.sessionDuration.textContent = `${duration.toFixed(1)}s`;
    } else {
      this.sessionDuration.textContent = '0s';
    }
  }

  private updateEventDisplay(): void {
    const events = this.keyboardHistory.getRecordedKeys();
    
    if (events.length === 0) {
      this.eventsList.innerHTML = `
        <li class="empty-state">
          <div class="empty-state-icon">⌨️</div>
          <p>No events recorded yet</p>
          <p><small>Start recording and type to see events appear here</small></p>
        </li>
      `;
      this.eventsInfo.textContent = 'Events will appear here in real-time';
      return;
    }

    // Show most recent events first (reverse chronological order for better UX)
    const recentEvents = [...events].reverse().slice(0, 100); // Limit display to last 100 events
    
    this.eventsList.innerHTML = recentEvents.map(event => {
      const timestamp = new Date(event.timestamp).toLocaleTimeString();
      const keyDisplay = this.formatKeyForDisplay(event.key);
      
      return `
        <li class="event-item">
          <div class="event-key">${keyDisplay}</div>
          <div class="event-duration">${event.duration.toFixed(1)}ms</div>
          <div class="event-timestamp">${timestamp}</div>
          <div class="event-code">${event.code}</div>
        </li>
      `;
    }).join('');

    this.eventsInfo.textContent = events.length > 100 
      ? `Showing last 100 of ${events.length} events`
      : `${events.length} events recorded`;
  }

  private formatKeyForDisplay(key: string): string {
    // Format special keys for better display
    const keyMap: { [key: string]: string } = {
      ' ': 'Space',
      'Enter': '↵ Enter',
      'Backspace': '⌫ Backspace',
      'Delete': '⌦ Delete',
      'Tab': '⇥ Tab',
      'Escape': '⎋ Escape',
      'ArrowUp': '↑ Up',
      'ArrowDown': '↓ Down',
      'ArrowLeft': '← Left',
      'ArrowRight': '→ Right',
      'Shift': '⇧ Shift',
      'Control': '⌃ Ctrl',
      'Alt': '⌥ Alt',
      'Meta': '⌘ Meta'
    };

    return keyMap[key] || key;
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    // Create a simple notification system
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 600;
      z-index: 1000;
      animation: slideIn 0.3s ease;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      background: ${type === 'success' ? '#28a745' : '#dc3545'};
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);

    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
        if (style.parentNode) {
          document.head.removeChild(style);
        }
      }, 300);
    }, 3000);
  }
}

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', () => {
  try {
    new KeyboardHistoryDemo();
    console.log('KeyboardHistory Demo initialized successfully');
  } catch (error) {
    console.error('Failed to initialize KeyboardHistory Demo:', error);
    
    // Show error message to user
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #dc3545;
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      z-index: 1000;
    `;
    errorDiv.innerHTML = `
      <h3>Demo Initialization Failed</h3>
      <p>${(error as Error).message}</p>
      <p><small>Please check the console for more details.</small></p>
    `;
    document.body.appendChild(errorDiv);
  }
});