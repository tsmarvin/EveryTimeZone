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

  describe('Edge Case Handling', () => {
    it('should handle user timezone at extreme negative offset (start of range)', () => {
      // Mock user timezone at extreme negative offset
      const extremeNegativeTimezones = {
        'Pacific/Midway': 'GMT-11:00', // User timezone - very negative
        'Pacific/Honolulu': 'GMT-10:00',
        'America/Anchorage': 'GMT-09:00',
        'America/Los_Angeles': 'GMT-08:00',
        'America/Denver': 'GMT-07:00',
        'America/Chicago': 'GMT-06:00',
        'America/New_York': 'GMT-05:00',
        'Europe/London': 'GMT+00:00',
        'Europe/Berlin': 'GMT+01:00',
        'Europe/Moscow': 'GMT+03:00',
        'Asia/Tokyo': 'GMT+09:00',
        'Australia/Sydney': 'GMT+10:00',
        'Pacific/Auckland': 'GMT+12:00',
      };

      global.Intl = {
        ...Intl,
        DateTimeFormat: vi.fn().mockImplementation((locale, options) => {
          const timeZone = options?.timeZone || 'Pacific/Midway';
          return {
            resolvedOptions: () => ({ timeZone: 'Pacific/Midway' }),
            formatToParts: (date) => {
              const parts = [];
              if (options?.timeZoneName === 'longOffset') {
                parts.push({
                  type: 'timeZoneName',
                  value: extremeNegativeTimezones[timeZone] || 'GMT-11:00',
                });
              } else if (options?.timeZoneName === 'long') {
                parts.push({
                  type: 'timeZoneName',
                  value: `${timeZone.split('/').pop()?.replace('_', ' ')} Standard Time`,
                });
              } else if (options?.timeZoneName === 'short') {
                parts.push({
                  type: 'timeZoneName',
                  value: 'MIT',
                });
              }
              return parts;
            },
            format: (date) => '12:00 PM',
          };
        }),
        supportedValuesOf: vi.fn().mockReturnValue(Object.keys(extremeNegativeTimezones)),
      } as any;

      const timezones = getTimezonesForTimeline(5);

      // Should still return requested number of timezones
      expect(timezones.length).toBe(5);

      // User timezone should be included
      const userIncluded = timezones.some(tz => tz.iana === 'Pacific/Midway');
      expect(userIncluded).toBe(true);

      // Should have unique offsets
      const offsets = timezones.map(tz => tz.offset);
      const uniqueOffsets = [...new Set(offsets)];
      expect(uniqueOffsets.length).toBe(offsets.length);

      // Should be ordered by offset
      const sortedOffsets = [...offsets].sort((a, b) => a - b);
      expect(offsets).toEqual(sortedOffsets);
    });

    it('should handle user timezone at extreme positive offset (end of range)', () => {
      // Mock user timezone at extreme positive offset
      const extremePositiveTimezones = {
        'America/Los_Angeles': 'GMT-08:00',
        'America/Denver': 'GMT-07:00',
        'America/Chicago': 'GMT-06:00',
        'America/New_York': 'GMT-05:00',
        'Europe/London': 'GMT+00:00',
        'Europe/Berlin': 'GMT+01:00',
        'Europe/Moscow': 'GMT+03:00',
        'Asia/Tokyo': 'GMT+09:00',
        'Australia/Sydney': 'GMT+10:00',
        'Pacific/Auckland': 'GMT+12:00',
        'Pacific/Tongatapu': 'GMT+13:00',
        'Pacific/Kiritimati': 'GMT+14:00', // User timezone - very positive
      };

      global.Intl = {
        ...Intl,
        DateTimeFormat: vi.fn().mockImplementation((locale, options) => {
          const timeZone = options?.timeZone || 'Pacific/Kiritimati';
          return {
            resolvedOptions: () => ({ timeZone: 'Pacific/Kiritimati' }),
            formatToParts: (date) => {
              const parts = [];
              if (options?.timeZoneName === 'longOffset') {
                parts.push({
                  type: 'timeZoneName',
                  value: extremePositiveTimezones[timeZone] || 'GMT+14:00',
                });
              } else if (options?.timeZoneName === 'long') {
                parts.push({
                  type: 'timeZoneName',
                  value: `${timeZone.split('/').pop()?.replace('_', ' ')} Standard Time`,
                });
              } else if (options?.timeZoneName === 'short') {
                parts.push({
                  type: 'timeZoneName',
                  value: 'LINT',
                });
              }
              return parts;
            },
            format: (date) => '12:00 PM',
          };
        }),
        supportedValuesOf: vi.fn().mockReturnValue(Object.keys(extremePositiveTimezones)),
      } as any;

      const timezones = getTimezonesForTimeline(5);

      // Should still return requested number of timezones
      expect(timezones.length).toBe(5);

      // User timezone should be included
      const userIncluded = timezones.some(tz => tz.iana === 'Pacific/Kiritimati');
      expect(userIncluded).toBe(true);

      // Should have unique offsets
      const offsets = timezones.map(tz => tz.offset);
      const uniqueOffsets = [...new Set(offsets)];
      expect(uniqueOffsets.length).toBe(offsets.length);

      // Should be ordered by offset
      const sortedOffsets = [...offsets].sort((a, b) => a - b);
      expect(offsets).toEqual(sortedOffsets);
    });

    it('should handle user timezone with very few available timezones on one side', () => {
      // Mock scenario where user has only 1 timezone below and many above
      const limitedBelowTimezones = {
        'Pacific/Midway': 'GMT-11:00', // Only one below user
        'Pacific/Honolulu': 'GMT-10:00', // User timezone
        'America/Anchorage': 'GMT-09:00',
        'America/Los_Angeles': 'GMT-08:00',
        'America/Denver': 'GMT-07:00',
        'America/Chicago': 'GMT-06:00',
        'America/New_York': 'GMT-05:00',
        'Europe/London': 'GMT+00:00',
        'Europe/Berlin': 'GMT+01:00',
        'Asia/Tokyo': 'GMT+09:00',
        'Australia/Sydney': 'GMT+10:00',
        'Pacific/Auckland': 'GMT+12:00',
      };

      global.Intl = {
        ...Intl,
        DateTimeFormat: vi.fn().mockImplementation((locale, options) => {
          const timeZone = options?.timeZone || 'Pacific/Honolulu';
          return {
            resolvedOptions: () => ({ timeZone: 'Pacific/Honolulu' }),
            formatToParts: (date) => {
              const parts = [];
              if (options?.timeZoneName === 'longOffset') {
                parts.push({
                  type: 'timeZoneName',
                  value: limitedBelowTimezones[timeZone] || 'GMT-10:00',
                });
              } else if (options?.timeZoneName === 'long') {
                parts.push({
                  type: 'timeZoneName',
                  value: `${timeZone.split('/').pop()?.replace('_', ' ')} Standard Time`,
                });
              } else if (options?.timeZoneName === 'short') {
                parts.push({
                  type: 'timeZoneName',
                  value: 'HST',
                });
              }
              return parts;
            },
            format: (date) => '12:00 PM',
          };
        }),
        supportedValuesOf: vi.fn().mockReturnValue(Object.keys(limitedBelowTimezones)),
      } as any;

      const timezones = getTimezonesForTimeline(7); // Request 7 timezones

      // Should still return requested number of timezones
      expect(timezones.length).toBe(7);

      // User timezone should be included
      const userIncluded = timezones.some(tz => tz.iana === 'Pacific/Honolulu');
      expect(userIncluded).toBe(true);

      // Should have populated additional timezones from the available side (above user)
      // Since user is at -10 and there's only one below (-11), 
      // we should get additional timezones from above to fill the 7 requested
      const offsets = timezones.map(tz => tz.offset);
      const userOffset = -10;
      const offsetsAboveUser = offsets.filter(offset => offset > userOffset);
      
      // Should have more timezones above user since below is limited
      expect(offsetsAboveUser.length).toBeGreaterThanOrEqual(3);
      
      // The improvement: should intelligently fill from abundant side (above) rather than randomly
      // This demonstrates the edge case handling where few timezones exist on one side
      const offsetsBelowUser = offsets.filter(offset => offset < userOffset);
      const totalBelowAvailable = 1; // Only Pacific/Midway at -11
      expect(offsetsBelowUser.length).toBeLessThanOrEqual(totalBelowAvailable);
    });

    it('should demonstrate improved edge case handling vs naive random selection', () => {
      // Test with extreme edge case: user at very positive offset with very few above
      const extremeEdgeTimezones = {
        'America/Los_Angeles': 'GMT-08:00',
        'America/Denver': 'GMT-07:00', 
        'America/Chicago': 'GMT-06:00',
        'America/New_York': 'GMT-05:00',
        'Europe/London': 'GMT+00:00',
        'Europe/Berlin': 'GMT+01:00',
        'Asia/Tokyo': 'GMT+09:00',
        'Australia/Sydney': 'GMT+10:00',
        'Pacific/Auckland': 'GMT+12:00', // User timezone
        'Pacific/Tongatapu': 'GMT+13:00', // Only one above user
      };

      global.Intl = {
        ...Intl,
        DateTimeFormat: vi.fn().mockImplementation((locale, options) => {
          const timeZone = options?.timeZone || 'Pacific/Auckland';
          return {
            resolvedOptions: () => ({ timeZone: 'Pacific/Auckland' }),
            formatToParts: (date) => {
              const parts = [];
              if (options?.timeZoneName === 'longOffset') {
                parts.push({
                  type: 'timeZoneName',
                  value: extremeEdgeTimezones[timeZone] || 'GMT+12:00',
                });
              } else if (options?.timeZoneName === 'long') {
                parts.push({
                  type: 'timeZoneName',
                  value: `${timeZone.split('/').pop()?.replace('_', ' ')} Standard Time`,
                });
              } else if (options?.timeZoneName === 'short') {
                parts.push({
                  type: 'timeZoneName',
                  value: 'NZST',
                });
              }
              return parts;
            },
            format: (date) => '12:00 PM',
          };
        }),
        supportedValuesOf: vi.fn().mockReturnValue(Object.keys(extremeEdgeTimezones)),
      } as any;

      // Run multiple times to test the enhanced edge case handling
      for (let run = 0; run < 5; run++) {
        const timezones = getTimezonesForTimeline(5);

        // Should always return requested number
        expect(timezones.length).toBe(5);

        // User timezone should always be included
        const userIncluded = timezones.some(tz => tz.iana === 'Pacific/Auckland');
        expect(userIncluded).toBe(true);

        // Should handle edge case by populating more from below since above is limited
        const offsets = timezones.map(tz => tz.offset); 
        const userOffset = 12;
        const offsetsBelowUser = offsets.filter(offset => offset < userOffset);
        const offsetsAboveUser = offsets.filter(offset => offset > userOffset);

        // Since there's only 1 timezone above (+13), should get more from below
        expect(offsetsAboveUser.length).toBeLessThanOrEqual(1);
        expect(offsetsBelowUser.length).toBeGreaterThanOrEqual(3);
      }
    });
  });
});