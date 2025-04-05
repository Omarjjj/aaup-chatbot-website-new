// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

(global as any).localStorage = localStorageMock;

// Add any other browser API mocks here if needed
(global as any).console = {
  ...console,
  // Silence console.log during tests
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
}; 