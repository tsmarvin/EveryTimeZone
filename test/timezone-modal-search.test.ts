/**
 * Timezone Modal Search Tests
 * Tests for search functionality, navigation, and user query preservation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TimezoneModal } from '../src/scripts/index.js';

describe('Timezone Modal Search', () => {
  let modal: TimezoneModal;
  let mockElements: Record<string, HTMLElement>;

  beforeEach(() => {
    // Mock DOM elements
    document.body.innerHTML = '';
    
    mockElements = {
      'timezone-modal': document.createElement('div'),
      'timezone-modal-overlay': document.createElement('div'),
      'timezone-input': document.createElement('input'),
      'timezone-wheel': document.createElement('div'),
      'select-timezone': document.createElement('button'),
      'cancel-timezone': document.createElement('button'),
      'wheel-up': document.createElement('button'),
      'wheel-down': document.createElement('button'),
    };

    // Set IDs and append to document
    Object.entries(mockElements).forEach(([id, element]) => {
      element.id = id;
      document.body.appendChild(element);
    });

    // Add modal-close button inside modal
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    mockElements['timezone-modal'].appendChild(closeButton);

    // Mock Intl APIs
    global.Intl = {
      ...Intl,
      DateTimeFormat: vi.fn().mockImplementation((locale, options) => ({
        resolvedOptions: () => ({ timeZone: 'America/New_York' }),
        formatToParts: (date) => {
          if (options?.timeZoneName === 'longOffset') {
            const timezoneOffsets: Record<string, string> = {
              'America/New_York': 'GMT-05:00',
              'Europe/London': 'GMT+00:00',
              'Asia/Tokyo': 'GMT+09:00',
              'America/Los_Angeles': 'GMT-08:00',
              'Europe/Paris': 'GMT+01:00',
              'Australia/Sydney': 'GMT+10:00',
            };
            return [{ type: 'timeZoneName', value: timezoneOffsets[options.timeZone] || 'GMT-05:00' }];
          } else if (options?.timeZoneName === 'long') {
            const timezoneNames: Record<string, string> = {
              'America/New_York': 'Eastern Standard Time',
              'Europe/London': 'Greenwich Mean Time', 
              'Asia/Tokyo': 'Japan Standard Time',
              'America/Los_Angeles': 'Pacific Standard Time',
              'Europe/Paris': 'Central European Time',
              'Australia/Sydney': 'Australian Eastern Standard Time',
            };
            return [{ type: 'timeZoneName', value: timezoneNames[options.timeZone] || 'Eastern Standard Time' }];
          } else if (options?.timeZoneName === 'short') {
            const timezoneAbbrs: Record<string, string> = {
              'America/New_York': 'EST',
              'Europe/London': 'GMT',
              'Asia/Tokyo': 'JST',
              'America/Los_Angeles': 'PST',
              'Europe/Paris': 'CET',
              'Australia/Sydney': 'AEST',
            };
            return [{ type: 'timeZoneName', value: timezoneAbbrs[options.timeZone] || 'EST' }];
          }
          return [{ type: 'timeZoneName', value: 'Eastern Standard Time' }];
        },
        format: (date) => '12:00 PM',
      })),
      supportedValuesOf: vi.fn().mockReturnValue([
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'America/Los_Angeles',
        'Europe/Paris',
        'Australia/Sydney',
      ]),
    } as any;

    // Create modal instance
    modal = new TimezoneModal();
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
  });

  describe('Search Query Preservation', () => {
    it('should preserve search text during up arrow navigation', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Enter search query
      input.value = 'tokyo';
      input.dispatchEvent(new Event('input'));
      
      // Verify search query is stored
      expect((modal as any).userSearchQuery).toBe('tokyo');
      expect(input.value).toBe('tokyo');
      
      // Navigate up with arrow key
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      mockElements['timezone-modal'].dispatchEvent(keyEvent);
      
      // Search query should be preserved in input
      expect(input.value).toBe('tokyo');
      expect((modal as any).userSearchQuery).toBe('tokyo');
    });

    it('should preserve search text during down arrow navigation', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Enter search query
      input.value = 'london';
      input.dispatchEvent(new Event('input'));
      
      // Verify search query is stored
      expect((modal as any).userSearchQuery).toBe('london');
      expect(input.value).toBe('london');
      
      // Navigate down with arrow key
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      mockElements['timezone-modal'].dispatchEvent(keyEvent);
      
      // Search query should be preserved in input
      expect(input.value).toBe('london');
      expect((modal as any).userSearchQuery).toBe('london');
    });

    it('should preserve search text during button navigation', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      const upButton = document.getElementById('wheel-up') as HTMLButtonElement;
      const downButton = document.getElementById('wheel-down') as HTMLButtonElement;
      
      // Enter search query
      input.value = 'paris';
      input.dispatchEvent(new Event('input'));
      
      // Navigate with up button
      upButton.click();
      expect(input.value).toBe('paris');
      expect((modal as any).userSearchQuery).toBe('paris');
      
      // Navigate with down button
      downButton.click();
      expect(input.value).toBe('paris');
      expect((modal as any).userSearchQuery).toBe('paris');
    });

    it('should preserve search query when modal is reopened', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Enter search query
      input.value = 'sydney';
      input.dispatchEvent(new Event('input'));
      
      // Close modal
      modal.close();
      
      // Reopen modal
      modal.open();
      
      // Search query should be restored
      expect(input.value).toBe('sydney');
      expect((modal as any).userSearchQuery).toBe('sydney');
    });

    it('should handle empty search query correctly', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Enter and clear search query
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      input.value = '';
      input.dispatchEvent(new Event('input'));
      
      // Should reset to empty
      expect((modal as any).userSearchQuery).toBe('');
      expect(input.value).toBe('');
      
      // Navigation should not affect empty search
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      mockElements['timezone-modal'].dispatchEvent(keyEvent);
      
      expect(input.value).toBe('');
    });
  });

  describe('Search Functionality', () => {
    it('should filter timezones by city name', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Search for "tokyo"
      input.value = 'tokyo';
      input.dispatchEvent(new Event('input'));
      
      // Check that filtered timezones contain Tokyo
      const filteredTimezones = (modal as any).filteredTimezones;
      const hasTokyoResult = filteredTimezones.some((tz: any) => 
        tz.cityName.toLowerCase().includes('tokyo') ||
        tz.iana.toLowerCase().includes('tokyo')
      );
      expect(hasTokyoResult).toBe(true);
    });

    it('should filter timezones by abbreviation', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Search for "EST"
      input.value = 'est';
      input.dispatchEvent(new Event('input'));
      
      // Check that filtered timezones contain EST timezone
      const filteredTimezones = (modal as any).filteredTimezones;
      const hasESTResult = filteredTimezones.some((tz: any) => 
        tz.abbreviation.toLowerCase().includes('est')
      );
      expect(hasESTResult).toBe(true);
    });

    it('should filter timezones by offset pattern (GMT+/-)', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Search for "GMT+9"
      input.value = 'gmt+9';
      input.dispatchEvent(new Event('input'));
      
      // Check that filtered timezones contain +9 offset timezone
      const filteredTimezones = (modal as any).filteredTimezones;
      const hasGMT9Result = filteredTimezones.some((tz: any) => 
        Math.abs(tz.offset - 9) < 0.01 // Use small epsilon for floating point comparison
      );
      expect(hasGMT9Result).toBe(true);
    });

    it('should reset selected index when search changes', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Navigate to select a different timezone
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      mockElements['timezone-modal'].dispatchEvent(keyEvent);
      mockElements['timezone-modal'].dispatchEvent(keyEvent);
      
      const initialSelectedIndex = (modal as any).selectedIndex;
      expect(initialSelectedIndex).toBeGreaterThan(0);
      
      // Enter search query
      input.value = 'london';
      input.dispatchEvent(new Event('input'));
      
      // Selected index should reset to 0
      expect((modal as any).selectedIndex).toBe(0);
    });

    it('should show all timezones when search is cleared', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Start with search
      input.value = 'tokyo';
      input.dispatchEvent(new Event('input'));
      
      const initialFilteredCount = (modal as any).filteredTimezones.length;
      const totalTimezones = (modal as any).timezones.length;
      
      // Clear search
      input.value = '';
      input.dispatchEvent(new Event('input'));
      
      // Should show all timezones again
      expect((modal as any).filteredTimezones.length).toBe(totalTimezones);
      expect((modal as any).filteredTimezones.length).toBeGreaterThan(initialFilteredCount);
    });
  });

  describe('Navigation Behavior', () => {
    it('should cycle through filtered results during navigation', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Search to get limited results
      input.value = 'america';
      input.dispatchEvent(new Event('input'));
      
      const filteredCount = (modal as any).filteredTimezones.length;
      expect(filteredCount).toBeGreaterThan(0);
      
      // Navigate down to last item
      for (let i = 0; i < filteredCount; i++) {
        const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        mockElements['timezone-modal'].dispatchEvent(keyEvent);
      }
      
      // Should cycle back to first item
      expect((modal as any).selectedIndex).toBe(0);
      
      // Search text should still be preserved
      expect(input.value).toBe('america');
    });

    it('should handle navigation with single search result', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Search for very specific term to get single result
      input.value = 'new_york';
      input.dispatchEvent(new Event('input'));
      
      const filteredCount = (modal as any).filteredTimezones.length;
      
      // Navigate up and down
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      
      mockElements['timezone-modal'].dispatchEvent(downEvent);
      mockElements['timezone-modal'].dispatchEvent(upEvent);
      
      // Should stay on same item (index 0) if only one result
      if (filteredCount === 1) {
        expect((modal as any).selectedIndex).toBe(0);
      }
      
      // Search text should be preserved
      expect(input.value).toBe('new_york');
    });
  });

  describe('Keyboard Navigation Integration', () => {
    it('should handle Enter key without affecting search query', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Enter search query
      input.value = 'london';
      input.dispatchEvent(new Event('input'));
      
      // Press Enter to select
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      mockElements['timezone-modal'].dispatchEvent(enterEvent);
      
      // Search query should be preserved (even though modal might close)
      expect((modal as any).userSearchQuery).toBe('london');
    });

    it('should handle Escape key without affecting search query', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Enter search query
      input.value = 'paris';
      input.dispatchEvent(new Event('input'));
      
      // Press Escape to close
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      mockElements['timezone-modal'].dispatchEvent(escapeEvent);
      
      // Search query should be preserved
      expect((modal as any).userSearchQuery).toBe('paris');
    });

    it('should handle left/right arrow keys same as up/down', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Enter search query
      input.value = 'tokyo';
      input.dispatchEvent(new Event('input'));
      
      // Navigate with left/right arrows
      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      
      mockElements['timezone-modal'].dispatchEvent(leftEvent);
      expect(input.value).toBe('tokyo');
      
      mockElements['timezone-modal'].dispatchEvent(rightEvent);
      expect(input.value).toBe('tokyo');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in search', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Search with special characters
      input.value = 'gmt+5:30';
      input.dispatchEvent(new Event('input'));
      
      // Should not crash and should store query
      expect((modal as any).userSearchQuery).toBe('gmt+5:30');
      expect(input.value).toBe('gmt+5:30');
      
      // Navigation should preserve special characters
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      mockElements['timezone-modal'].dispatchEvent(keyEvent);
      expect(input.value).toBe('gmt+5:30');
    });

    it('should handle very long search queries', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Very long search query
      const longQuery = 'a'.repeat(100);
      input.value = longQuery;
      input.dispatchEvent(new Event('input'));
      
      // Should handle gracefully
      expect((modal as any).userSearchQuery).toBe(longQuery);
      
      // Navigation should preserve long query
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      mockElements['timezone-modal'].dispatchEvent(keyEvent);
      expect(input.value).toBe(longQuery);
    });

    it('should trim whitespace in search queries', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Search with leading/trailing whitespace
      input.value = '  tokyo  ';
      input.dispatchEvent(new Event('input'));
      
      // Should store trimmed version
      expect((modal as any).userSearchQuery).toBe('tokyo');
      
      // But input should show original value for user experience
      expect(input.value).toBe('  tokyo  ');
    });

    it('should handle rapid search query changes', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Rapid search changes
      const queries = ['t', 'to', 'tok', 'toky', 'tokyo'];
      
      queries.forEach(query => {
        input.value = query;
        input.dispatchEvent(new Event('input'));
        expect((modal as any).userSearchQuery).toBe(query);
      });
      
      // Navigation should preserve final query
      const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      mockElements['timezone-modal'].dispatchEvent(keyEvent);
      expect(input.value).toBe('tokyo');
    });
  });

  describe('Modal State Management', () => {
    it('should initialize with empty search query', () => {
      // Fresh modal should have empty search
      expect((modal as any).userSearchQuery).toBe('');
      
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should preserve search state across multiple open/close cycles', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Set search query
      input.value = 'sydney';
      input.dispatchEvent(new Event('input'));
      
      // Multiple close/open cycles
      for (let i = 0; i < 3; i++) {
        modal.close();
        modal.open();
        expect(input.value).toBe('sydney');
        expect((modal as any).userSearchQuery).toBe('sydney');
      }
    });

    it('should handle focus management with search preservation', () => {
      const input = document.getElementById('timezone-input') as HTMLInputElement;
      
      // Set search query
      input.value = 'berlin';
      input.dispatchEvent(new Event('input'));
      
      // Mock focus behavior
      vi.spyOn(input, 'focus');
      
      // Open modal (should focus and preserve search)
      modal.open();
      
      // Focus should be called after timeout
      setTimeout(() => {
        expect(input.focus).toHaveBeenCalled();
        expect(input.value).toBe('berlin');
      }, 150);
    });
  });
});