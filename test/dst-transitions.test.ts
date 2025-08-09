/**
 * Tests for DST transition handling
 * Validates that timezone display updates correctly when date selector changes across DST boundaries
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUserTimezone, getTimezonesForTimeline } from '../src/scripts/index.js';

describe('DST Transition Handling', () => {
  beforeEach(() => {
    // Mock current date to August 7, 2025 (DST period)
    vi.setSystemTime(new Date('2025-08-07T18:00:00.000Z')); // 6 PM UTC on Aug 7, 2025
  });

  describe('Los Angeles DST Transitions', () => {
    beforeEach(() => {
      // Mock Temporal API
      vi.stubGlobal('Temporal', {
        Now: {
          timeZoneId: () => 'America/Los_Angeles',
        },
      });
    });

    it('should show Pacific Daylight Time (PDT -7) during summer', () => {
      const summerDate = new Date('2025-08-07T18:00:00.000Z'); // August 7, 2025
      
      // Mock Intl to return PDT during summer
      global.Intl = {
        ...Intl,
        DateTimeFormat: vi.fn().mockImplementation(() => ({
          resolvedOptions: () => ({ timeZone: 'America/Los_Angeles' }),
          formatToParts: (date) => [
            { type: 'timeZoneName', value: 'GMT-07:00' }
          ],
        })),
        supportedValuesOf: vi.fn().mockReturnValue(['America/Los_Angeles']),
      } as any;

      const userTz = getUserTimezone(summerDate);
      
      expect(userTz.offset).toBe(-7);
      expect(userTz.iana).toBe('America/Los_Angeles');
      expect(userTz.cityName).toBe('Los Angeles');
    });

    it('should show Pacific Standard Time (PST -8) during winter', () => {
      const winterDate = new Date('2025-12-31T18:00:00.000Z'); // December 31, 2025
      
      // Mock Intl to return PST during winter
      global.Intl = {
        ...Intl,
        DateTimeFormat: vi.fn().mockImplementation(() => ({
          resolvedOptions: () => ({ timeZone: 'America/Los_Angeles' }),
          formatToParts: (date) => [
            { type: 'timeZoneName', value: 'GMT-08:00' }
          ],
        })),
        supportedValuesOf: vi.fn().mockReturnValue(['America/Los_Angeles']),
      } as any;

      const userTz = getUserTimezone(winterDate);
      
      expect(userTz.offset).toBe(-8);
      expect(userTz.iana).toBe('America/Los_Angeles');
      expect(userTz.cityName).toBe('Los Angeles');
    });

    it('should correctly handle DST transition in timeline generation', () => {
      // Mock Intl to simulate realistic DST behavior
      global.Intl = {
        ...Intl,
        DateTimeFormat: vi.fn().mockImplementation(() => {
          // Create a mock that simulates different offsets based on the date passed to formatToParts
          return {
            resolvedOptions: () => ({ timeZone: 'America/Los_Angeles' }),
            formatToParts: (date) => {
              // Simulate DST: summer months (March-November) use PDT (-7), winter uses PST (-8)
              const month = (date || new Date()).getMonth();
              const isDST = month >= 2 && month <= 10; // March (2) through November (10)
              return [
                { type: 'timeZoneName', value: isDST ? 'GMT-07:00' : 'GMT-08:00' }
              ];
            },
          };
        }),
        supportedValuesOf: vi.fn().mockReturnValue(['America/Los_Angeles']),
      } as any;

      // Test summer date
      const summerDate = new Date('2025-08-07T18:00:00.000Z'); // August 7, 2025
      const summerUserTz = getUserTimezone(summerDate);
      expect(summerUserTz.offset).toBe(-7); // PDT

      // Test winter date  
      const winterDate = new Date('2025-12-31T18:00:00.000Z'); // December 31, 2025
      const winterUserTz = getUserTimezone(winterDate);
      expect(winterUserTz.offset).toBe(-8); // PST

      // Test that timeline respects the date-specific DST calculation
      const summerTimezones = getTimezonesForTimeline(3, summerDate);
      const winterTimezones = getTimezonesForTimeline(3, winterDate);

      const summerLA = summerTimezones.find(tz => tz.iana === 'America/Los_Angeles');
      const winterLA = winterTimezones.find(tz => tz.iana === 'America/Los_Angeles');

      expect(summerLA?.offset).toBe(-7); // PDT in summer
      expect(winterLA?.offset).toBe(-8); // PST in winter
    });
  });

  describe('New York DST Transitions', () => {
    beforeEach(() => {
      // Mock Temporal API for New York
      vi.stubGlobal('Temporal', {
        Now: {
          timeZoneId: () => 'America/New_York',
        },
      });
    });

    it('should handle Eastern timezone DST transitions', () => {
      // Mock Intl to simulate EDT/EST behavior
      global.Intl = {
        ...Intl,
        DateTimeFormat: vi.fn().mockImplementation(() => ({
          resolvedOptions: () => ({ timeZone: 'America/New_York' }),
          formatToParts: (date) => {
            const month = (date || new Date()).getMonth();
            const isDST = month >= 2 && month <= 10; // March through November
            return [
              { type: 'timeZoneName', value: isDST ? 'GMT-04:00' : 'GMT-05:00' }
            ];
          },
        })),
        supportedValuesOf: vi.fn().mockReturnValue(['America/New_York']),
      } as any;

      // Test summer (EDT)
      const summerDate = new Date('2025-08-07T18:00:00.000Z');
      const userTzSummer = getUserTimezone(summerDate);
      expect(userTzSummer.offset).toBe(-4); // EDT

      // Test winter (EST)
      const winterDate = new Date('2025-12-31T18:00:00.000Z');
      const userTzWinter = getUserTimezone(winterDate);
      expect(userTzWinter.offset).toBe(-5); // EST
    });
  });

  describe('Enhanced API Functionality', () => {
    it('should use current date when no date parameter is provided', () => {
      global.Intl = {
        ...Intl,
        DateTimeFormat: vi.fn().mockImplementation(() => ({
          resolvedOptions: () => ({ timeZone: 'America/Los_Angeles' }),
          formatToParts: () => [{ type: 'timeZoneName', value: 'GMT-07:00' }],
        })),
        supportedValuesOf: vi.fn().mockReturnValue(['America/Los_Angeles']),
      } as any;

      const userTz = getUserTimezone(); // No date parameter
      expect(userTz.iana).toBe('America/Los_Angeles');
      expect(userTz.offset).toBe(-7);
    });

    it('should return different timezone lists for different dates', () => {
      // Mock setup for testing
      global.Intl = {
        ...Intl,
        DateTimeFormat: vi.fn().mockImplementation(() => ({
          resolvedOptions: () => ({ timeZone: 'America/Los_Angeles' }),
          formatToParts: (date) => {
            const month = (date || new Date()).getMonth();
            const isDST = month >= 2 && month <= 10;
            return [
              { type: 'timeZoneName', value: isDST ? 'GMT-07:00' : 'GMT-08:00' }
            ];
          },
        })),
        supportedValuesOf: vi.fn().mockReturnValue(['America/Los_Angeles']),
      } as any;

      const summerTimezones = getTimezonesForTimeline(3, new Date('2025-08-07'));
      const winterTimezones = getTimezonesForTimeline(3, new Date('2025-12-31'));

      // Should get some timezones back
      expect(summerTimezones.length).toBeGreaterThanOrEqual(1);
      expect(winterTimezones.length).toBeGreaterThanOrEqual(1);

      // The user timezone should have different offsets
      const summerUserTz = summerTimezones.find(tz => tz.iana === 'America/Los_Angeles');
      const winterUserTz = winterTimezones.find(tz => tz.iana === 'America/Los_Angeles');

      expect(summerUserTz?.offset).toBe(-7); // PDT
      expect(winterUserTz?.offset).toBe(-8); // PST
    });
  });
});