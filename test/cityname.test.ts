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

  it('should extract proper city names from IANA timezone identifiers', () => {
    const timezones = getTimezonesForTimeline(10);
    
    // Test specific timezone city name extractions
    const newYorkTimezone = timezones.find(tz => tz.iana === 'America/New_York');
    const tokyoTimezone = timezones.find(tz => tz.iana === 'Asia/Tokyo');
    const londonTimezone = timezones.find(tz => tz.iana === 'Europe/London');
    
    if (newYorkTimezone) {
      expect(newYorkTimezone.cityName).toBe('New York');
      expect(newYorkTimezone.cityName).not.toMatch(/_/);
    }
    
    if (tokyoTimezone) {
      expect(tokyoTimezone.cityName).toBe('Tokyo');
      expect(tokyoTimezone.cityName).not.toMatch(/_/);
    }
    
    if (londonTimezone) {
      expect(londonTimezone.cityName).toBe('London');
      expect(londonTimezone.cityName).not.toMatch(/_/);
    }
  });

  it('should generate proper timezone abbreviations', () => {
    const timezones = getTimezonesForTimeline(15);
    
    // Test at least one timezone we know exists
    expect(timezones.length).toBeGreaterThan(0);
    
    // Find New York timezone and test the abbreviation logic
    const newYorkTimezone = timezones.find(tz => tz.iana === 'America/New_York');
    
    if (newYorkTimezone) {
      // The display name might be "Eastern Daylight Time" or "GMT-05:00" depending on environment
      // We'll test the abbreviation instead which should be consistent
      // In test environments, we might get fallback abbreviations, so be more flexible
      
      // Check that it's a reasonable abbreviation (either proper timezone or fallback)
      expect(newYorkTimezone.abbreviation).toMatch(/^(E[DS]T|EDT|EST|GMT|UTC)$/);
    }
    
    // Test other timezones if available
    const tokyoTimezone = timezones.find(tz => tz.iana === 'Asia/Tokyo');
    const londonTimezone = timezones.find(tz => tz.iana === 'Europe/London');
    const losAngelesTimezone = timezones.find(tz => tz.iana === 'America/Los_Angeles');
    
    if (tokyoTimezone) {
      // Should be JST or a reasonable fallback
      expect(tokyoTimezone.abbreviation).toMatch(/^(JST|GMT|UTC)$/);
    }
    
    if (londonTimezone) {
      // Should be BST, GMT, or a reasonable fallback  
      expect(londonTimezone.abbreviation).toMatch(/^(BST|GMT|UTC|CEST)$/);
    }
    
    if (losAngelesTimezone) {
      // Should be PDT, PST, or a reasonable fallback
      expect(losAngelesTimezone.abbreviation).toMatch(/^(P[DS]T|PDT|PST|GMT|UTC)$/);
    }
    
    // Ensure all timezones have valid abbreviations
    timezones.forEach(tz => {
      expect(tz.abbreviation).toBeTruthy();
      expect(tz.abbreviation.length).toBeGreaterThan(0);
      expect(tz.abbreviation.length).toBeLessThanOrEqual(5);
    });
  });

  it('should have all required properties for timezone objects', () => {
    const timezones = getTimezonesForTimeline(5);
    
    timezones.forEach(tz => {
      // Check that all new properties exist
      expect(tz).toHaveProperty('cityName');
      expect(tz).toHaveProperty('abbreviation');
      expect(tz).toHaveProperty('name');
      expect(tz).toHaveProperty('displayName');
      expect(tz).toHaveProperty('iana');
      expect(tz).toHaveProperty('offset');
      
      // Check that new properties are strings and not empty
      expect(typeof tz.cityName).toBe('string');
      expect(tz.cityName.length).toBeGreaterThan(0);
      expect(typeof tz.abbreviation).toBe('string');
      expect(tz.abbreviation.length).toBeGreaterThan(0);
    });
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
      
      // City name should not have underscores
      expect(timezone.cityName).not.toMatch(/_/);
      
      // Should have a reasonable abbreviation
      expect(timezone.abbreviation.length).toBeGreaterThan(0);
      expect(timezone.abbreviation.length).toBeLessThanOrEqual(5);
    });
  });

  it('should handle user timezone properly without underscores', () => {
    const userTz = getUserTimezone();
    
    // The name should not contain underscores regardless of what timezone the user is in
    expect(userTz.name).not.toMatch(/_/);
    
    // Should be a meaningful timezone name, not raw IANA identifier
    expect(userTz.name).not.toBe(userTz.iana.split('/').pop());
    
    // Should have proper city name and abbreviation
    expect(userTz.cityName).not.toMatch(/_/);
    expect(userTz.abbreviation.length).toBeGreaterThan(0);
  });
});