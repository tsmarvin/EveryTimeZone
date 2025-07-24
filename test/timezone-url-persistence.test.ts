/**
 * Timezone URL Persistence Tests
 * Tests for URL parameter handling of selected timezones
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimelineManager } from '../src/scripts/index.js';
import { loadActualHTML } from './setup.js';

describe('Timezone URL Persistence', () => {
  let timelineManager: TimelineManager;

  beforeEach(() => {
    // Load the actual HTML from the site
    loadActualHTML();
    
    // Reset URL state
    window.location.search = '';
    
    // Mock history.replaceState
    vi.spyOn(history, 'replaceState').mockImplementation(() => {});
  });

  describe('URL Parameter Parsing', () => {
    it('should initialize with default timezones when no URL parameters', () => {
      timelineManager = new TimelineManager();
      const timezones = timelineManager.getSelectedTimezones();
      
      // Should have some default timezones
      expect(timezones.length).toBeGreaterThan(0);
      
      // Should include user's timezone
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const hasUserTz = timezones.some(tz => tz.iana === userTz);
      expect(hasUserTz).toBe(true);
    });

    it('should parse single timezone from URL parameters', () => {
      window.location.search = '?timezones=America/New_York';
      timelineManager = new TimelineManager();
      const timezones = timelineManager.getSelectedTimezones();
      
      expect(timezones.length).toBe(1);
      expect(timezones[0].iana).toBe('America/New_York');
    });

    it('should parse multiple timezones from URL parameters', () => {
      window.location.search = '?timezones=America/New_York,Europe/London,Asia/Tokyo';
      timelineManager = new TimelineManager();
      const timezones = timelineManager.getSelectedTimezones();
      
      expect(timezones.length).toBe(3);
      expect(timezones.map(tz => tz.iana)).toEqual([
        'America/New_York',
        'Europe/London', 
        'Asia/Tokyo'
      ]);
    });

    it('should handle URL-encoded timezone parameters', () => {
      window.location.search = '?timezones=America%2FNew_York%2CEurope%2FLondon';
      timelineManager = new TimelineManager();
      const timezones = timelineManager.getSelectedTimezones();
      
      expect(timezones.length).toBe(2);
      expect(timezones.map(tz => tz.iana)).toEqual([
        'America/New_York',
        'Europe/London'
      ]);
    });

    it('should ignore invalid timezone identifiers', () => {
      window.location.search = '?timezones=America/New_York,Invalid/Timezone,Europe/London';
      timelineManager = new TimelineManager();
      const timezones = timelineManager.getSelectedTimezones();
      
      // Should only include valid timezones
      expect(timezones.length).toBe(2);
      expect(timezones.map(tz => tz.iana)).toEqual([
        'America/New_York',
        'Europe/London'
      ]);
    });

    it('should fallback to default timezones when all URL timezones are invalid', () => {
      window.location.search = '?timezones=Invalid/Timezone1,Invalid/Timezone2';
      timelineManager = new TimelineManager();
      const timezones = timelineManager.getSelectedTimezones();
      
      // Should fallback to default behavior (multiple default timezones)
      expect(timezones.length).toBeGreaterThan(0);
    });
  });

  describe('URL Parameter Updates', () => {
    beforeEach(() => {
      timelineManager = new TimelineManager();
    });

    it('should update URL when timezone is added', () => {
      const newTimezone = {
        name: 'Tokyo',
        offset: 9,
        displayName: 'Japan Standard Time',
        iana: 'Asia/Tokyo',
        cityName: 'Tokyo',
        abbreviation: 'JST'
      };
      
      timelineManager.addTimezone(newTimezone);
      
      expect(history.replaceState).toHaveBeenCalled();
      
      // Get the URL that was passed to replaceState
      const calls = vi.mocked(history.replaceState).mock.calls;
      const lastCall = calls[calls.length - 1];
      const url = lastCall[2];
      
      expect(url).toContain('timezones=');
      expect(url).toContain('Asia%2FTokyo'); // URL-encoded version
    });

    it('should update URL when timezone is removed', () => {
      // First add a timezone to have something to remove
      const testTimezone = {
        name: 'Tokyo',
        offset: 9,
        displayName: 'Japan Standard Time',
        iana: 'Asia/Tokyo',
        cityName: 'Tokyo',
        abbreviation: 'JST'
      };
      
      timelineManager.addTimezone(testTimezone);
      vi.clearAllMocks(); // Clear previous calls
      
      timelineManager.removeTimezone(testTimezone);
      
      expect(history.replaceState).toHaveBeenCalled();
      
      // Get the URL that was passed to replaceState
      const calls = vi.mocked(history.replaceState).mock.calls;
      const lastCall = calls[calls.length - 1];
      const url = lastCall[2];
      
      // Asia/Tokyo should no longer be in the URL
      expect(url).not.toContain('Asia/Tokyo');
    });

    it('should preserve other URL parameters when updating timezones', () => {
      window.location.search = '?theme=forest-harmony&mode=light';
      window.location.href = 'http://localhost:3000/?theme=forest-harmony&mode=light';
      
      // Create new manager to pick up URL params
      timelineManager = new TimelineManager();
      
      const newTimezone = {
        name: 'Sydney',
        offset: 10,
        displayName: 'Australian Eastern Standard Time',
        iana: 'Australia/Sydney',
        cityName: 'Sydney',
        abbreviation: 'AEST'
      };
      
      timelineManager.addTimezone(newTimezone);
      
      // Get the URL that was passed to replaceState
      const calls = vi.mocked(history.replaceState).mock.calls;
      const lastCall = calls[calls.length - 1];
      const url = lastCall[2];
      
      expect(url).toContain('theme=forest-harmony');
      expect(url).toContain('mode=light');
      expect(url).toContain('timezones=');
      expect(url).toContain('Australia%2FSydney'); // URL-encoded version
    });

    it('should remove timezones parameter when no timezones are selected', () => {
      // Start with a timezone in URL
      window.location.search = '?timezones=Asia/Tokyo';
      timelineManager = new TimelineManager();
      
      // Remove all timezones
      const timezones = timelineManager.getSelectedTimezones();
      timezones.forEach(tz => timelineManager.removeTimezone(tz));
      
      // Should have updated URL to remove timezones parameter
      const calls = vi.mocked(history.replaceState).mock.calls;
      const lastCall = calls[calls.length - 1];
      const url = lastCall[2];
      
      expect(url).not.toContain('timezones=');
    });
  });

  describe('Integration with Settings', () => {
    it('should work alongside existing settings URL parameters', () => {
      window.location.search = '?theme=neon-cyber&mode=light&timeFormat=24h&timezones=America/New_York,Europe/London';
      
      timelineManager = new TimelineManager();
      const timezones = timelineManager.getSelectedTimezones();
      
      expect(timezones.length).toBe(2);
      expect(timezones.map(tz => tz.iana)).toEqual([
        'America/New_York',
        'Europe/London'
      ]);
      
      // Settings should still work
      const urlParams = new URLSearchParams(window.location.search);
      expect(urlParams.get('theme')).toBe('neon-cyber');
      expect(urlParams.get('mode')).toBe('light');
      expect(urlParams.get('timeFormat')).toBe('24h');
    });
  });
});