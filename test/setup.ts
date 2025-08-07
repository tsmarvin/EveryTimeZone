/**
 * Test setup file for Vitest
 */

import { beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { Temporal } from '@js-temporal/polyfill';

/**
 * Load the actual HTML from the built site for testing
 */
export function loadActualHTML(): void {
  const htmlPath = '/home/runner/work/EveryTimeZone/EveryTimeZone/dist/index.html';
  const htmlContent = readFileSync(htmlPath, 'utf-8');
  
  // Extract the body content from the HTML
  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    document.body.innerHTML = bodyMatch[1];
  }
  
  // Extract and add stylesheets and scripts to head for context
  const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*)<\/head>/i);
  if (headMatch) {
    const headContent = headMatch[1];
    // Extract CSS links and meta tags
    const cssLinks = headContent.match(/<link[^>]*rel="stylesheet"[^>]*>/gi) || [];
    const metaTags = headContent.match(/<meta[^>]*>/gi) || [];
    const title = headContent.match(/<title[^>]*>([^<]*)<\/title>/i);
    
    document.head.innerHTML = [
      ...metaTags,
      ...(title ? [title[0]] : []),
      ...cssLinks
    ].join('\n');
  }
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock matchMedia
const matchMediaMock = vi.fn().mockImplementation((query) => ({
  matches: query === '(prefers-color-scheme: dark)', // Default to dark mode
  media: query,
  onchange: null,
  addListener: vi.fn(), // deprecated
  removeListener: vi.fn(), // deprecated
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Setup global mocks IMMEDIATELY before any modules are imported
vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('matchMedia', matchMediaMock);

// Setup Temporal polyfill globally for tests
vi.stubGlobal('Temporal', Temporal);

// Mock timers to control timeout behavior in tests
vi.useFakeTimers();

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

// Mock URL constructor and URLSearchParams
global.URL = URL;
global.URLSearchParams = URLSearchParams;

// Mock history API
const historyMock = {
  pushState: vi.fn(),
  replaceState: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  go: vi.fn(),
};
vi.stubGlobal('history', historyMock);

// Mock Intl APIs globally
global.Intl = {
  ...Intl,
  DateTimeFormat: vi.fn().mockImplementation(() => ({
    resolvedOptions: () => ({ timeZone: 'America/New_York' }),
    formatToParts: () => [
      { type: 'timeZoneName', value: 'GMT-05:00' }
    ],
  })),
  supportedValuesOf: vi.fn().mockReturnValue([
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo'
  ]),
} as any;

// Mock document ready state to prevent auto-initialization
Object.defineProperty(document, 'readyState', {
  value: 'loading',
  writable: true,
  configurable: true,
});

// Mock URL and history  
delete (window as any).location;
(window as any).location = {
  href: 'http://localhost:3000/',
  search: '',
} as Location;

// Setup per-test initialization
beforeEach(() => {
  // Reset localStorage mock
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();

  // Reset matchMedia mock
  matchMediaMock.mockClear();

  // Reset URL state to prevent test bleeding
  window.location.href = 'http://localhost:3000/';
  window.location.search = '';

  // Reset DOM
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.body.className = '';

  // Mock console methods to reduce test noise
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// Clean up timers and other async operations after each test
afterEach(() => {
  // Clear all timers to prevent unhandled timeouts
  vi.clearAllTimers();
  vi.runOnlyPendingTimers();
  
  // Remove all event listeners from window to prevent memory leaks
  const windowClone = { ...window };
  Object.getOwnPropertyNames(windowClone).forEach(prop => {
    if (typeof windowClone[prop] === 'function' && prop.startsWith('on')) {
      window[prop] = null;
    }
  });
});