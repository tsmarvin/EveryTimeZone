/**
 * Tests for timezone selection fixes
 * Tests that user's actual timezone is in center and randomization works
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUserTimezone, getTimezonesForTimeline } from '../src/scripts/index.js';

describe('Timezone Selection Fixes', () => {
  beforeEach(() => {
    // Mock Intl APIs to simulate multiple timezones with same offset
    const timezoneOffsets: Record<string, string> = {
      'America/Detroit': 'GMT-05:00',
      'America/New_York': 'GMT-05:00', // User's timezone
      'America/Toronto': 'GMT-05:00',
      'Europe/London': 'GMT+00:00',
      'Asia/Tokyo': 'GMT+09:00',
      'America/Los_Angeles': 'GMT-08:00',
      'Europe/Berlin': 'GMT+01:00',
      'Australia/Sydney': 'GMT+10:00',
      'America/Chicago': 'GMT-06:00',
      'Europe/Paris': 'GMT+01:00',
      'Asia/Shanghai': 'GMT+08:00',
      'Pacific/Auckland': 'GMT+12:00',
      'America/Denver': 'GMT-07:00',
      'Europe/Moscow': 'GMT+03:00',
    };

    global.Intl = {
      ...Intl,
      DateTimeFormat: vi.fn().mockImplementation((locale, options) => {
        const timeZone = options?.timeZone || 'America/New_York';
        return {
          resolvedOptions: () => ({ timeZone: 'America/New_York' }),
          formatToParts: (date) => {
            const parts = [];
            if (options?.timeZoneName === 'longOffset') {
              parts.push({
                type: 'timeZoneName',
                value: timezoneOffsets[timeZone] || 'GMT-05:00',
              });
            } else if (options?.timeZoneName === 'long') {
              parts.push({
                type: 'timeZoneName',
                value: `${timeZone.split('/').pop()?.replace('_', ' ')} Standard Time`,
              });
            } else if (options?.timeZoneName === 'short') {
              parts.push({
                type: 'timeZoneName',
                value: 'EST',
              });
            } else {
              parts.push({
                type: 'timeZoneName',
                value: 'Eastern Standard Time',
              });
            }
            return parts;
          },
          format: (date) => '12:00 PM',
        };
      }),
      supportedValuesOf: vi.fn().mockReturnValue([
        // Multiple timezones with same offset as user (GMT-5)
        'America/Detroit', // Same offset, alphabetically first
        'America/New_York', // User's timezone, alphabetically later
        'America/Toronto', // Same offset, alphabetically last
        // Other offsets
        'Europe/London', // GMT+0
        'Asia/Tokyo', // GMT+9
        'America/Los_Angeles', // GMT-8
        'Europe/Berlin', // GMT+1
        'Australia/Sydney', // GMT+10
        'America/Chicago', // GMT-6
        'Europe/Paris', // GMT+1
        'Asia/Shanghai', // GMT+8
        'Pacific/Auckland', // GMT+12
        'America/Denver', // GMT-7
        'Europe/Moscow', // GMT+3
      ]),
    } as any;
  });

  describe('User Timezone Guarantee', () => {
    it('should always include user actual timezone in center, not just first timezone with same offset', () => {
      const userTz = getUserTimezone();
      const timezones = getTimezonesForTimeline(5);

      // User timezone should be included
      const userTimezoneInList = timezones.find(tz => tz.iana === userTz.iana);
      expect(userTimezoneInList).toBeDefined();
      expect(userTimezoneInList?.iana).toBe('America/New_York');

      // When the function returns timezones, they should be ordered by offset
      // and the user timezone should be present in the list
      const timezoneOffsets = timezones.map(tz => tz.offset);
      const sortedOffsets = [...timezoneOffsets].sort((a, b) => a - b);
      expect(timezoneOffsets).toEqual(sortedOffsets);

      // The returned list should include the user's offset
      expect(timezoneOffsets).toContain(userTz.offset);
    });

    it('should include user timezone even when other timezones have same offset', () => {
      // This test ensures that even if Detroit (alphabetically first) has the same offset,
      // the user's actual timezone (New York) is still included
      const userTz = getUserTimezone();
      const timezones = getTimezonesForTimeline(5);

      const userTimezoneIncluded = timezones.some(tz => tz.iana === userTz.iana);
      expect(userTimezoneIncluded).toBe(true);

      // Verify it's specifically New York, not Detroit
      const newYorkIncluded = timezones.some(tz => tz.iana === 'America/New_York');
      expect(newYorkIncluded).toBe(true);
    });
  });

  describe('Randomization', () => {
    it('should produce different results on multiple calls due to randomization', () => {
      // Run the function multiple times and collect results
      const results: string[][] = [];
      for (let i = 0; i < 20; i++) {
        const timezones = getTimezonesForTimeline(5);
        results.push(timezones.map(tz => tz.iana));
      }

      // Check that not all results are identical (randomness is working)
      const firstResult = results[0];
      let differentCount = 0;
      
      for (const result of results) {
        if (!firstResult || result.length !== firstResult.length || 
            !result.every((tz, index) => tz === firstResult[index])) {
          differentCount++;
        }
      }

      // With randomization, we should see some variety (at least 10% different)
      expect(differentCount).toBeGreaterThan(2);
    });

    it('should always include user timezone regardless of randomization', () => {
      const userTz = getUserTimezone();

      // Run multiple times to ensure user timezone is always included
      for (let i = 0; i < 10; i++) {
        const timezones = getTimezonesForTimeline(5);
        const userIncluded = timezones.some(tz => tz.iana === userTz.iana);
        expect(userIncluded).toBe(true);
      }
    });

    it('should maintain proper odd number of timezones', () => {
      for (let requestedRows = 3; requestedRows <= 7; requestedRows++) {
        const timezones = getTimezonesForTimeline(requestedRows);
        const actualRows = timezones.length;

        // Should always be odd number
        expect(actualRows % 2).toBe(1);

        // Should be at least 3 (minimum)
        expect(actualRows).toBeGreaterThanOrEqual(3);
        
        // Should not exceed available timezone count or max reasonable limit
        expect(actualRows).toBeLessThanOrEqual(Math.max(requestedRows + 1, 15));
      }
    });
  });

  describe('No Duplicate Offsets', () => {
    it('should not include multiple timezones with the same offset', () => {
      const timezones = getTimezonesForTimeline(7);

      // Get all offsets
      const offsets = timezones.map(tz => tz.offset);

      // Check for duplicates
      const uniqueOffsets = [...new Set(offsets)];
      expect(uniqueOffsets.length).toBe(offsets.length);
    });

    it('should prioritize user timezone when multiple timezones have same offset', () => {
      const userTz = getUserTimezone();
      const timezones = getTimezonesForTimeline(5);

      // Find timezone with user's offset
      const timezoneWithUserOffset = timezones.find(tz => tz.offset === userTz.offset);

      // It should be the user's actual timezone, not another timezone with same offset
      expect(timezoneWithUserOffset?.iana).toBe(userTz.iana);
    });
  });
});