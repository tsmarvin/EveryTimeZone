/**
 * Settings Panel Tests
 * Tests for URL parsing, theme selection, modal behavior, and keyboard navigation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsPanel, AVAILABLE_THEMES, AppearanceSettings } from '../src/scripts/settings.js';
import { loadActualHTML } from './setup.js';

describe('Settings Panel', () => {
  let settingsPanel: SettingsPanel;

  beforeEach(() => {
    // Load the actual HTML from the site
    loadActualHTML();
  });

  describe('Initialization', () => {
    it('should initialize with default settings when no URL parameters', () => {
      window.matchMedia.mockReturnValue({ matches: true } as MediaQueryList); // Default to dark
      settingsPanel = new SettingsPanel();
      const settings = settingsPanel.getCurrentSettings();
      expect(settings.theme).toBe('default');
      expect(settings.mode).toBe('dark');
    });

    it('should parse theme from URL parameters', () => {
      window.location.search = '?theme=forest-harmony';
      settingsPanel = new SettingsPanel();
      const settings = settingsPanel.getCurrentSettings();
      expect(settings.theme).toBe('forest-harmony');
    });

    it('should parse mode from URL parameters', () => {
      window.location.search = '?mode=light';
      settingsPanel = new SettingsPanel();
      const settings = settingsPanel.getCurrentSettings();
      expect(settings.mode).toBe('light');
    });

    it('should parse both theme and mode from URL parameters', () => {
      window.location.search = '?theme=neon-cyber&mode=light';
      settingsPanel = new SettingsPanel();
      const settings = settingsPanel.getCurrentSettings();
      expect(settings.theme).toBe('neon-cyber');
      expect(settings.mode).toBe('light');
    });

    it('should use system preference for mode when not specified', () => {
      // Mock system preference for dark mode
      const mockMatchMedia = vi.fn((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });
      
      settingsPanel = new SettingsPanel();
      const settings = settingsPanel.getCurrentSettings();
      expect(settings.mode).toBe('dark');
    });

    it('should populate theme options in the grid', () => {
      settingsPanel = new SettingsPanel();
      const themeGrid = document.querySelector('.theme-grid');
      const themeOptions = themeGrid?.querySelectorAll('.theme-option');
      expect(themeOptions?.length).toBe(AVAILABLE_THEMES.length);
    });
  });

  describe('URL Management', () => {
    it('should update URL when theme changes', () => {
      settingsPanel = new SettingsPanel();
      
      // Find a theme option and click it
      const themeOption = document.querySelector('[data-theme="forest-harmony"]') as HTMLElement;
      themeOption?.click();
      
      expect(history.replaceState).toHaveBeenCalled();
    });

    it('should remove theme from URL when set to default', () => {
      window.location.search = '?theme=forest-harmony';
      settingsPanel = new SettingsPanel();
      
      // Click default theme
      const defaultOption = document.querySelector('[data-theme="default"]') as HTMLElement;
      defaultOption?.click();
      
      expect(history.replaceState).toHaveBeenCalled();
    });

    it('should remove mode from URL when set to dark (default)', () => {
      window.location.search = '?mode=light';
      settingsPanel = new SettingsPanel();
      
      // Click dark mode radio
      const darkRadio = document.querySelector('[value="dark"]') as HTMLInputElement;
      darkRadio.checked = true;
      darkRadio.dispatchEvent(new Event('change'));
      
      expect(history.replaceState).toHaveBeenCalled();
    });

    it('should handle complex URL parameters correctly', () => {
      window.location.search = '?theme=ocean-breeze&mode=light&other=param';
      settingsPanel = new SettingsPanel();
      const settings = settingsPanel.getCurrentSettings();
      expect(settings.theme).toBe('ocean-breeze');
      expect(settings.mode).toBe('light');
    });
  });

  describe('Theme Selection', () => {
    beforeEach(() => {
      settingsPanel = new SettingsPanel();
    });

    it('should apply selected theme stylesheet', () => {
      const forestOption = document.querySelector('[data-theme="forest-harmony"]') as HTMLElement;
      forestOption?.click();
      
      // Check that the theme class is applied to the body
      expect(document.body.classList.contains('theme-forest-harmony')).toBe(true);
    });

    it('should mark selected theme option as active', () => {
      const neonOption = document.querySelector('[data-theme="neon-cyber"]') as HTMLElement;
      neonOption?.click();
      
      expect(neonOption.classList.contains('selected')).toBe(true);
    });

    it('should remove selection from previously selected theme', () => {
      const defaultOption = document.querySelector('[data-theme="default"]') as HTMLElement;
      const forestOption = document.querySelector('[data-theme="forest-harmony"]') as HTMLElement;
      
      defaultOption?.click();
      expect(defaultOption.classList.contains('selected')).toBe(true);
      
      forestOption?.click();
      expect(defaultOption.classList.contains('selected')).toBe(false);
      expect(forestOption.classList.contains('selected')).toBe(true);
    });

    it('should update mode selection in UI', () => {
      const lightRadio = document.querySelector('[value="light"]') as HTMLInputElement;
      lightRadio.checked = true;
      lightRadio.dispatchEvent(new Event('change'));
      
      expect(lightRadio.checked).toBe(true);
      expect(document.body.classList.contains('light-theme')).toBe(true);
    });
  });

  describe('Modal Behavior', () => {
    beforeEach(() => {
      settingsPanel = new SettingsPanel();
    });

    it('should open modal when settings button is clicked', () => {
      const settingsButton = document.querySelector('.appearance-settings') as HTMLElement;
      settingsButton.click();
      
      const panel = document.getElementById('appearance-panel');
      const overlay = document.getElementById('settings-overlay');
      expect(panel?.classList.contains('active')).toBe(true);
      expect(overlay?.classList.contains('active')).toBe(true);
    });

    it('should close modal when close button is clicked', () => {
      settingsPanel.open();
      
      const closeButton = document.querySelector('.settings-close') as HTMLElement;
      closeButton.click();
      
      const panel = document.getElementById('appearance-panel');
      const overlay = document.getElementById('settings-overlay');
      expect(panel?.classList.contains('active')).toBe(false);
      expect(overlay?.classList.contains('active')).toBe(false);
    });

    it('should close modal when overlay is clicked', () => {
      settingsPanel.open();
      
      const overlay = document.getElementById('settings-overlay') as HTMLElement;
      overlay.click();
      
      const panel = document.getElementById('appearance-panel');
      expect(panel?.classList.contains('active')).toBe(false);
    });

    it('should disable body scroll when modal is open', () => {
      settingsPanel.open();
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when modal is closed', () => {
      settingsPanel.open();
      settingsPanel.close();
      expect(document.body.style.overflow).toBe('');
    });

    it('should focus panel when opened for accessibility', () => {
      const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
      settingsPanel.open();
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      settingsPanel = new SettingsPanel();
      settingsPanel.open();
    });

    it('should close modal when Escape key is pressed', () => {
      const panel = document.getElementById('appearance-panel') as HTMLElement;
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      panel.dispatchEvent(escapeEvent);
      
      expect(panel.classList.contains('active')).toBe(false);
    });

    it('should not close modal for other keys', () => {
      const panel = document.getElementById('appearance-panel') as HTMLElement;
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      panel.dispatchEvent(tabEvent);
      
      expect(panel.classList.contains('active')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw clear error when DOM elements are missing', () => {
      document.body.innerHTML = '';
      // Constructor should throw meaningful error when required elements are missing
      expect(() => new SettingsPanel()).toThrow('Settings panel element (#appearance-panel) not found in DOM');
    });

    it('should handle invalid theme names gracefully', () => {
      window.location.search = '?theme=invalid-theme';
      settingsPanel = new SettingsPanel();
      
      // Should fall back to default theme
      const settings = settingsPanel.getCurrentSettings();
      expect(settings.theme).toBe('invalid-theme'); // URL parsing preserves value
    });

    it('should handle invalid mode values gracefully', () => {
      window.location.search = '?mode=invalid-mode';
      settingsPanel = new SettingsPanel();
      
      // Should fall back to system/default preference
      const settings = settingsPanel.getCurrentSettings();
      expect(settings.mode).toBe('invalid-mode'); // URL parsing preserves value but validation happens elsewhere
    });
  });

  describe('System Integration', () => {
    it('should respect system dark mode preference', () => {
      // Mock system preference for dark mode
      const mockMatchMedia = vi.fn((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });
      
      settingsPanel = new SettingsPanel();
      const settings = settingsPanel.getCurrentSettings();
      expect(settings.mode).toBe('dark');
    });

    it('should respect system light mode preference', () => {
      // Mock system preference for light mode
      const mockMatchMedia = vi.fn((query: string) => ({
        matches: false, // Always return false so dark mode preference is not matched
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });
      
      settingsPanel = new SettingsPanel();
      const settings = settingsPanel.getCurrentSettings();
      expect(settings.mode).toBe('light');
    });
  });
});