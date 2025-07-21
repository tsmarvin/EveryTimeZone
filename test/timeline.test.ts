/**
 * Timeline Responsive Design Tests
 * Tests for timeline dimensions and responsive breakpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getTimelineDimensions, 
  getUserTimezone, 
  getTimezonesForTimeline,
  generateTimelineHours,
  createTimelineData 
} from '../src/scripts/index.js';

describe('Timeline Responsive Design', () => {
  beforeEach(() => {
    // Mock Intl APIs
    global.Intl = {
      ...Intl,
      DateTimeFormat: vi.fn().mockImplementation((locale, options) => ({
        resolvedOptions: () => ({ timeZone: 'America/New_York' }),
        formatToParts: (date) => [
          { type: 'timeZoneName', value: options?.timeZoneName === 'longOffset' ? 'GMT-05:00' : 'Eastern Standard Time' }
        ],
        format: (date) => '12:00 PM',
      })),
      supportedValuesOf: vi.fn().mockReturnValue([
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'America/Los_Angeles',
        'Europe/Berlin'
      ]),
    } as any;
  });

  describe('Responsive Timeline Dimensions', () => {
    it('should calculate mobile dimensions correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
      
      const dimensions = getTimelineDimensions();
      
      expect(dimensions.numHours).toBe(6); // Minimum for mobile
      expect(dimensions.numRows).toBeGreaterThanOrEqual(3); // Minimum rows
      expect(dimensions.numRows).toBeLessThanOrEqual(12); // Maximum rows
    });

    it('should calculate tablet dimensions correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true });
      
      const dimensions = getTimelineDimensions();
      
      expect(dimensions.numHours).toBe(12); // Tablet breakpoint
      expect(dimensions.numRows).toBeGreaterThanOrEqual(3);
      expect(dimensions.numRows).toBeLessThanOrEqual(12);
    });

    it('should calculate desktop dimensions correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
      
      const dimensions = getTimelineDimensions();
      
      expect(dimensions.numHours).toBe(24); // Desktop shows full day
      expect(dimensions.numRows).toBeGreaterThanOrEqual(3);
      expect(dimensions.numRows).toBeLessThanOrEqual(12);
    });

    it('should calculate large desktop dimensions correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
      
      const dimensions = getTimelineDimensions();
      
      expect(dimensions.numHours).toBe(24); // Full day on large screens
      expect(dimensions.numRows).toBeGreaterThanOrEqual(3);
      expect(dimensions.numRows).toBeLessThanOrEqual(12);
    });

    it('should handle intermediate screen sizes', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
      
      const dimensions = getTimelineDimensions();
      
      expect(dimensions.numHours).toBe(18); // Intermediate breakpoint
      expect(dimensions.numRows).toBeGreaterThanOrEqual(3);
      expect(dimensions.numRows).toBeLessThanOrEqual(12);
    });

    it('should respect minimum and maximum constraints', () => {
      // Test very small screen
      Object.defineProperty(window, 'innerWidth', { value: 200, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 300, writable: true });
      
      const smallDimensions = getTimelineDimensions();
      expect(smallDimensions.numHours).toBeGreaterThanOrEqual(6);
      expect(smallDimensions.numRows).toBeGreaterThanOrEqual(3);
      
      // Test very large screen
      Object.defineProperty(window, 'innerWidth', { value: 4000, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 3000, writable: true });
      
      const largeDimensions = getTimelineDimensions();
      expect(largeDimensions.numHours).toBeLessThanOrEqual(24);
      expect(largeDimensions.numRows).toBeLessThanOrEqual(12);
    });

    it('should calculate rows based on available height', () => {
      // Test tall narrow screen
      Object.defineProperty(window, 'innerWidth', { value: 400, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1200, writable: true });
      
      const tallDimensions = getTimelineDimensions();
      expect(tallDimensions.numRows).toBeGreaterThan(3); // Should fit more rows
      
      // Test short wide screen
      Object.defineProperty(window, 'innerWidth', { value: 1600, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 400, writable: true });
      
      const shortDimensions = getTimelineDimensions();
      expect(shortDimensions.numRows).toBe(3); // Should be minimum due to height
    });

    it('should generate timeline data with correct dimensions', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
      
      const dimensions = getTimelineDimensions();
      const timelineData = createTimelineData(dimensions.numHours, dimensions.numRows);
      
      expect(timelineData.length).toBeLessThanOrEqual(dimensions.numRows);
      
      // Each row should have the correct number of hours
      timelineData.forEach(row => {
        expect(row.hours.length).toBe(dimensions.numHours);
      });
    });
  });
});