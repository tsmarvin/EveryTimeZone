/**
 * Theme Management Tests
 * Tests for theme switching through the settings panel (the actual implementation)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsPanel } from '../src/scripts/settings.js';
import { loadActualHTML } from './setup.js';

describe('Theme Management (Real Implementation)', () => {
  let settingsPanel: SettingsPanel;

  beforeEach(() => {
    // Load the actual HTML from the site
    loadActualHTML();
    
    // Initialize the settings panel (which handles theme management)
    settingsPanel = new SettingsPanel();
  });

  describe('Mode Selection through Settings Panel', () => {
    it('should initialize with dark mode by default when system prefers dark', () => {
      window.matchMedia.mockReturnValue({ matches: true } as MediaQueryList);
      const newPanel = new SettingsPanel();
      expect(document.body.classList.contains('dark-theme')).toBe(true);
    });

    it('should initialize with light mode when system prefers light', () => {
      window.matchMedia.mockReturnValue({ matches: false } as MediaQueryList);
      const newPanel = new SettingsPanel();
      expect(document.body.classList.contains('light-theme')).toBe(true);
    });

    it('should switch to light mode when light mode radio is selected', () => {
      const lightModeRadio = document.querySelector('input[name="mode"][value="light"]') as HTMLInputElement;
      expect(lightModeRadio).toBeTruthy();
      
      lightModeRadio.checked = true;
      lightModeRadio.dispatchEvent(new Event('change'));
      
      expect(document.body.classList.contains('light-theme')).toBe(true);
      expect(document.body.classList.contains('dark-theme')).toBe(false);
    });

    it('should switch to dark mode when dark mode radio is selected', () => {
      // First set to light mode
      document.body.className = 'light-theme';
      
      const darkModeRadio = document.querySelector('input[name="mode"][value="dark"]') as HTMLInputElement;
      expect(darkModeRadio).toBeTruthy();
      
      darkModeRadio.checked = true;
      darkModeRadio.dispatchEvent(new Event('change'));
      
      expect(document.body.classList.contains('dark-theme')).toBe(true);
      expect(document.body.classList.contains('light-theme')).toBe(false);
    });

    it('should persist mode selection to URL parameters', () => {
      const settingsPanel = new SettingsPanel();
      const lightModeRadio = document.querySelector('input[name="mode"][value="light"]') as HTMLInputElement;
      lightModeRadio.checked = true;
      lightModeRadio.dispatchEvent(new Event('change'));
      
      // Check that the URL was updated (mocked history.replaceState should be called)
      expect(window.history.replaceState).toHaveBeenCalled();
      
      // Check that the settings panel reflects the change
      expect(settingsPanel.getCurrentSettings().mode).toBe('light');
    });

    it('should show correct mode icons in the settings panel', () => {
      const darkModeIcon = document.querySelector('input[value="dark"]')?.parentElement?.querySelector('.mode-icon');
      const lightModeIcon = document.querySelector('input[value="light"]')?.parentElement?.querySelector('.mode-icon');
      
      expect(darkModeIcon?.textContent).toBe('🌙');
      expect(lightModeIcon?.textContent).toBe('☀️');
    });
  });

  describe('Theme Selection through Settings Panel', () => {
    it('should initialize with default theme', () => {
      const settings = settingsPanel.getCurrentSettings();
      expect(settings.theme).toBe('default');
    });

    it('should populate theme grid with available themes', () => {
      const themeGrid = document.querySelector('.theme-grid');
      expect(themeGrid).toBeTruthy();
      
      // The theme grid should be populated by the settings panel
      // This is done dynamically, so we check if the initialization works
      expect(themeGrid?.children.length).toBeGreaterThan(0);
    });

    it('should apply selected theme when theme option is clicked', () => {
      // Simulate clicking a theme option
      const themeOptions = document.querySelectorAll('.theme-option');
      if (themeOptions.length > 0) {
        const firstOption = themeOptions[0] as HTMLElement;
        firstOption.click();
        
        // Check that theme selection logic was triggered
        // This depends on the actual implementation
        expect(firstOption.classList.contains('selected')).toBe(true);
      }
    });
  });

  describe('Settings Panel Integration', () => {
    it('should open settings panel when appearance button is clicked', () => {
      const appearanceButton = document.querySelector('.appearance-settings') as HTMLElement;
      expect(appearanceButton).toBeTruthy();
      
      appearanceButton.click();
      
      const panel = document.getElementById('appearance-panel');
      expect(panel?.classList.contains('active')).toBe(true);
    });

    it('should close settings panel when close button is clicked', () => {
      // First open the panel
      settingsPanel.open();
      
      const closeButton = document.querySelector('.settings-close') as HTMLElement;
      expect(closeButton).toBeTruthy();
      
      closeButton.click();
      
      const panel = document.getElementById('appearance-panel');
      expect(panel?.classList.contains('active')).toBe(false);
    });

    it('should manage focus for accessibility when panel opens', () => {
      const panel = document.getElementById('appearance-panel') as HTMLElement;
      const focusSpy = vi.spyOn(panel, 'focus');
      
      settingsPanel.open();
      
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should throw clear error when theme grid is missing', () => {
      // Remove theme grid to test error handling
      const themeGrid = document.querySelector('.theme-grid');
      themeGrid?.remove();
      
      // Should throw meaningful error when theme grid is missing
      expect(() => new SettingsPanel()).toThrow('Theme grid element (.theme-grid) not found in settings panel');
    });

    it('should handle missing mode elements gracefully', () => {
      // Remove mode radios to test error handling
      const modeRadios = document.querySelectorAll('.mode-radio');
      modeRadios.forEach(radio => radio.remove());
      
      // Should not throw when trying to initialize without mode radios
      expect(() => new SettingsPanel()).not.toThrow();
    });
  });
});