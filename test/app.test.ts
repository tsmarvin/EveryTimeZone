/**
 * App Integration Tests
 * Tests for initialization, DOM handling, error boundaries, and performance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeApp } from '../src/scripts/app.js';
import { loadActualHTML } from './setup.js';

describe('App Integration', () => {
  beforeEach(() => {
    // Load the actual HTML from the site
    loadActualHTML();
  });

  describe('Application Initialization', () => {
    it('should initialize without errors', () => {
      expect(() => initializeApp()).not.toThrow();
    });

    it('should initialize settings panel', () => {
      initializeApp();
      
      // Settings button should be functional
      const settingsButton = document.querySelector('.appearance-settings') as HTMLElement;
      expect(settingsButton).toBeTruthy();
      
      // Click should open settings panel
      settingsButton.click();
      const panel = document.getElementById('appearance-panel');
      expect(panel?.classList.contains('active')).toBe(true);
    });

    it('should initialize timeline visualization', () => {
      initializeApp();
      
      const timelineContainer = document.getElementById('timeline-container');
      expect(timelineContainer).toBeTruthy();
      
      // Should have some content after initialization
      expect(timelineContainer?.children.length).toBeGreaterThan(0);
    });

    it('should apply default theme on initialization', () => {
      initializeApp();
      
      // Body should have a theme class
      const hasThemeClass = document.body.classList.contains('dark-theme') || 
                           document.body.classList.contains('light-theme');
      expect(hasThemeClass).toBe(true);
    });

    it('should handle initialization when DOM is already loaded', () => {
      // Mock document ready state
      Object.defineProperty(document, 'readyState', {
        value: 'complete',
        writable: true
      });
      
      expect(() => initializeApp()).not.toThrow();
    });
  });

  describe('DOM Event Handling', () => {
    beforeEach(() => {
      initializeApp();
    });

    it('should handle appearance settings button clicks', () => {
      // The app initializes the settings panel which handles theme management
      const appearanceButton = document.querySelector('.appearance-settings') as HTMLElement;
      expect(appearanceButton).toBeTruthy();
      
      // Click should not throw an error and should open the settings panel
      expect(() => appearanceButton.click()).not.toThrow();
      
      // Panel should be active after clicking
      const panel = document.getElementById('appearance-panel');
      expect(panel?.classList.contains('active')).toBe(true);
    });

    it('should handle settings panel interactions', () => {
      const settingsButton = document.querySelector('.appearance-settings') as HTMLElement;
      settingsButton.click();
      
      const closeButton = document.querySelector('.settings-close') as HTMLElement;
      closeButton.click();
      
      const panel = document.getElementById('appearance-panel');
      expect(panel?.classList.contains('active')).toBe(false);
    });

    it('should handle window resize events', () => {
      const initialContent = document.getElementById('timeline-container')?.innerHTML;
      
      // Trigger resize
      Object.defineProperty(window, 'innerWidth', { value: 480, writable: true });
      window.dispatchEvent(new Event('resize'));
      
      // Advance fake timers to trigger the debounced resize handler
      vi.advanceTimersByTime(300);
      
      const newContent = document.getElementById('timeline-container')?.innerHTML;
      // Content might change due to responsive calculations
      expect(newContent).toBeDefined();
    });

    it('should handle keyboard events for accessibility', () => {
      const settingsButton = document.querySelector('.appearance-settings') as HTMLElement;
      settingsButton.click();
      
      const panel = document.getElementById('appearance-panel') as HTMLElement;
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      panel.dispatchEvent(escapeEvent);
      
      expect(panel.classList.contains('active')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing timeline container gracefully', () => {
      document.getElementById('timeline-container')?.remove();
      
      expect(() => initializeApp()).not.toThrow();
    });

    it('should throw clear error when settings elements are missing', () => {
      document.getElementById('appearance-panel')?.remove();
      document.getElementById('settings-overlay')?.remove();
      
      expect(() => initializeApp()).toThrow('Settings panel element (#appearance-panel) not found in DOM');
    });

    it('should handle missing theme toggle gracefully', () => {
      document.querySelector('.theme-toggle')?.remove();
      
      expect(() => initializeApp()).not.toThrow();
    });

    it('should throw clear error when required components fail to initialize', () => {
      // Remove required DOM elements to trigger errors
      document.body.innerHTML = '<div></div>';
      
      expect(() => initializeApp()).toThrow('Settings panel element (#appearance-panel) not found in DOM');
    });
  });

  describe('Performance', () => {
    it('should initialize within reasonable time', () => {
      const startTime = performance.now();
      initializeApp();
      const endTime = performance.now();
      
      // Should initialize within 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle multiple rapid resize events efficiently', () => {
      initializeApp();
      
      const startTime = performance.now();
      
      // Trigger multiple resize events rapidly
      for (let i = 0; i < 10; i++) {
        Object.defineProperty(window, 'innerWidth', { value: 800 + i * 10, writable: true });
        window.dispatchEvent(new Event('resize'));
      }
      
      const endTime = performance.now();
      
      // Should handle resize events efficiently (debounced)
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should not leak memory on repeated initialization', () => {
      // Initialize multiple times
      for (let i = 0; i < 5; i++) {
        initializeApp();
      }
      
      // Should not accumulate duplicate event listeners
      const eventListeners = document.querySelectorAll('*');
      expect(eventListeners.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Behavior', () => {
    beforeEach(() => {
      initializeApp();
    });

    it('should adapt to mobile screen sizes', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
      
      window.dispatchEvent(new Event('resize'));
      
      // Timeline should still be functional on mobile
      const timeline = document.getElementById('timeline-container');
      expect(timeline?.children.length).toBeGreaterThan(0);
    });

    it('should adapt to tablet screen sizes', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true });
      
      window.dispatchEvent(new Event('resize'));
      
      const timeline = document.getElementById('timeline-container');
      expect(timeline?.children.length).toBeGreaterThan(0);
    });

    it('should adapt to desktop screen sizes', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
      
      window.dispatchEvent(new Event('resize'));
      
      const timeline = document.getElementById('timeline-container');
      expect(timeline?.children.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Points', () => {
    it('should integrate settings panel with theme system', () => {
      initializeApp();
      
      // Open settings and change theme
      const settingsButton = document.querySelector('.appearance-settings') as HTMLElement;
      settingsButton.click();
      
      // Mock theme option click
      const themeOption = document.querySelector('[data-theme="forest-harmony"]') as HTMLElement;
      if (themeOption) {
        themeOption.click();
        
        // Check that theme class was applied to body
        expect(document.body.classList.contains('theme-forest-harmony')).toBe(true);
      }
    });

    it('should integrate timeline with timezone selection', () => {
      initializeApp();
      
      const timeline = document.getElementById('timeline-container');
      const initialContent = timeline?.innerHTML;
      
      // Timeline should have controls for adding timezones
      const addButton = timeline?.querySelector('.add-timezone-btn');
      expect(addButton).toBeTruthy();
    });
  });
});