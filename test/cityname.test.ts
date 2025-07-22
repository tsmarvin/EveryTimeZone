/**
 * Test for city name display - ensuring underscores are replaced with spaces
 */

import { describe, it, expect } from 'vitest';
import { getUserTimezone, getTimezonesForTimeline, getAllTimezonesOrdered } from '../src/scripts/index';

describe('City Name Display', () => {
  it('should display city names with spaces instead of underscores in timezone objects', () => {
    // Get a test timezone that we know has underscores in IANA format
    const timezones = getTimezonesForTimeline(10);
    
    // Look for timezones that should have spaces in their display names
    const newYorkTimezone = timezones.find(tz => tz.iana === 'America/New_York');
    const losAngelesTimezone = timezones.find(tz => tz.iana === 'America/Los_Angeles');
    
    if (newYorkTimezone) {
      // The name property should show "New York" not "New_York"
      expect(newYorkTimezone.name).toBe('New York');
      expect(newYorkTimezone.name).not.toBe('New_York');
    }
    
    if (losAngelesTimezone) {
      // The name property should show "Los Angeles" not "Los_Angeles"
      expect(losAngelesTimezone.name).toBe('Los Angeles');
      expect(losAngelesTimezone.name).not.toBe('Los_Angeles');
    }
  });

  it('should display city names with spaces in all timezones from getAllTimezonesOrdered', () => {
    const allTimezones = getAllTimezonesOrdered();
    
    // Find specific timezones we know have underscores
    const underscoreTimezones = allTimezones.filter(tz => 
      tz.iana.includes('New_York') || 
      tz.iana.includes('Los_Angeles') ||
      tz.iana.includes('Mexico_City') ||
      tz.iana.includes('Puerto_Rico')
    );
    
    underscoreTimezones.forEach(timezone => {
      // The display name should not contain underscores
      expect(timezone.name).not.toMatch(/_/);
      
      // Specific checks for known cases
      if (timezone.iana === 'America/New_York') {
        expect(timezone.name).toBe('New York');
      }
      if (timezone.iana === 'America/Los_Angeles') {
        expect(timezone.name).toBe('Los Angeles');
      }
      if (timezone.iana === 'America/Mexico_City') {
        expect(timezone.name).toBe('Mexico City');
      }
    });
  });

  it('should handle user timezone with spaces correctly', () => {
    // Mock the user timezone to one with underscores
    // Note: This test may not be applicable if user is not in a timezone with underscores
    // But we test the principle
    const userTz = getUserTimezone();
    
    // The name should not contain underscores regardless of what timezone the user is in
    expect(userTz.name).not.toMatch(/_/);
  });
});