/**
 * Test for timezone name display - ensuring proper localized timezone names
 */

import { describe, it, expect } from 'vitest';
import { getUserTimezone, getTimezonesForTimeline, getAllTimezonesOrdered } from '../src/scripts/index';

describe('Timezone Name Display', () => {
  it('should display proper localized timezone names instead of raw IANA identifiers', () => {
    // Get a test timezone that we know has underscores in IANA format
    const timezones = getTimezonesForTimeline(10);
    
    // Look for timezones that should have proper display names
    const newYorkTimezone = timezones.find(tz => tz.iana === 'America/New_York');
    const losAngelesTimezone = timezones.find(tz => tz.iana === 'America/Los_Angeles');
    
    if (newYorkTimezone) {
      // The name property should be a proper timezone name, not raw IANA identifier
      expect(newYorkTimezone.name).not.toBe('New_York');
      expect(newYorkTimezone.name).not.toMatch(/_/);
      // Should be a meaningful timezone name (like "Eastern Daylight Time")
      expect(newYorkTimezone.name.length).toBeGreaterThan(3);
      expect(newYorkTimezone.name).toMatch(/time|GMT|UTC/i);
    }
    
    if (losAngelesTimezone) {
      // The name property should be a proper timezone name, not raw IANA identifier
      expect(losAngelesTimezone.name).not.toBe('Los_Angeles');
      expect(losAngelesTimezone.name).not.toMatch(/_/);
      // Should be a meaningful timezone name (like "Pacific Daylight Time")
      expect(losAngelesTimezone.name.length).toBeGreaterThan(3);
      expect(losAngelesTimezone.name).toMatch(/time|GMT|UTC/i);
    }
  });

  it('should display proper timezone names for all timezones from getAllTimezonesOrdered', () => {
    const allTimezones = getAllTimezonesOrdered();
    
    // Find specific timezones we know have underscores in IANA format
    const underscoreTimezones = allTimezones.filter(tz => 
      tz.iana.includes('New_York') || 
      tz.iana.includes('Los_Angeles') ||
      tz.iana.includes('Mexico_City') ||
      tz.iana.includes('Puerto_Rico')
    );
    
    underscoreTimezones.forEach(timezone => {
      // The display name should not contain underscores
      expect(timezone.name).not.toMatch(/_/);
      
      // Should be a meaningful timezone name or UTC offset, not raw IANA identifier
      expect(timezone.name).not.toBe(timezone.iana.split('/').pop());
      
      // Should be either a proper timezone name or UTC offset format
      const isTimeName = timezone.name.match(/time|GMT/i);
      const isUTCOffset = timezone.name.match(/^UTC[+-]\d{2}:\d{2}$/);
      
      expect(isTimeName || isUTCOffset).toBeTruthy();
    });
  });

  it('should handle user timezone properly without underscores', () => {
    const userTz = getUserTimezone();
    
    // The name should not contain underscores regardless of what timezone the user is in
    expect(userTz.name).not.toMatch(/_/);
    
    // Should be a meaningful timezone name, not raw IANA identifier
    expect(userTz.name).not.toBe(userTz.iana.split('/').pop());
  });
});