import '@testing-library/jest-dom';

// Mock IntersectionObserver for Framer Motion in tests
global.IntersectionObserver = class IntersectionObserver {
  constructor() { }
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
};
