// Jest setup file for KeyboardHistory tests
// Configure test environment and global settings

// Mock performance.now() for consistent testing
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now())
  }
});

// Mock addEventListener and removeEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener
});

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});