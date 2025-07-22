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
      
      expect(dimensions.numHours).toBe(24); // Always show 24 hours as per requirement
      expect(dimensions.numRows).toBeGreaterThanOrEqual(3); // Minimum rows
      expect(dimensions.numRows).toBeLessThanOrEqual(12); // Maximum rows
    });

    it('should calculate tablet dimensions correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true });
      
      const dimensions = getTimelineDimensions();
      
      expect(dimensions.numHours).toBe(24); // Always show 24 hours as per requirement
      expect(dimensions.numRows).toBeGreaterThanOrEqual(3);
      expect(dimensions.numRows).toBeLessThanOrEqual(12);
    });

    it('should calculate desktop dimensions correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
      
      const dimensions = getTimelineDimensions();
      
      expect(dimensions.numHours).toBe(24); // Always show 24 hours as per requirement
      expect(dimensions.numRows).toBeGreaterThanOrEqual(3);
      expect(dimensions.numRows).toBeLessThanOrEqual(12);
    });

    it('should calculate large desktop dimensions correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
      
      const dimensions = getTimelineDimensions();
      
      expect(dimensions.numHours).toBe(24); // Always show 24 hours as per requirement
      expect(dimensions.numRows).toBeGreaterThanOrEqual(3);
      expect(dimensions.numRows).toBeLessThanOrEqual(12);
    });

    it('should handle intermediate screen sizes', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
      
      const dimensions = getTimelineDimensions();
      
      expect(dimensions.numHours).toBe(24); // Always show 24 hours as per requirement
      expect(dimensions.numRows).toBeGreaterThanOrEqual(3);
      expect(dimensions.numRows).toBeLessThanOrEqual(12);
    });

    it('should respect minimum and maximum constraints', () => {
      // Test very small screen
      Object.defineProperty(window, 'innerWidth', { value: 200, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 300, writable: true });
      
      const smallDimensions = getTimelineDimensions();
      expect(smallDimensions.numHours).toBe(24); // Always show 24 hours as per requirement
      expect(smallDimensions.numRows).toBeGreaterThanOrEqual(3);
      
      // Test very large screen
      Object.defineProperty(window, 'innerWidth', { value: 4000, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 3000, writable: true });
      
      const largeDimensions = getTimelineDimensions();
      expect(largeDimensions.numHours).toBe(24); // Always show 24 hours as per requirement
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
      
      // Each row should have exactly 24 hours
      timelineData.forEach(row => {
        expect(row.hours.length).toBe(24);
      });
    });

    it('should calculate optimal columns based on available width', () => {
      // With our new design, we always show 24 hours regardless of width
      Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
      
      const mediumDimensions = getTimelineDimensions();
      
      Object.defineProperty(window, 'innerWidth', { value: 1600, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
      
      const wideDimensions = getTimelineDimensions();
      
      // Both should show 24 hours as that's our new requirement
      expect(mediumDimensions.numHours).toBe(24);
      expect(wideDimensions.numHours).toBe(24);
    });

    it('should prefer common hour increments', () => {
      // With our new design, we always show exactly 24 hours regardless of width
      const commonIncrements = [4, 6, 8, 12, 16, 18, 24];
      
      for (let width = 600; width <= 2000; width += 200) {
        Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
        
        const dimensions = getTimelineDimensions();
        
        // Always expect exactly 24 hours
        expect(dimensions.numHours).toBe(24);
        
        // 24 is indeed a common increment
        expect(commonIncrements).toContain(dimensions.numHours);
      }
    });
  });

  describe('Timeline Manager Default Timezone Selection', () => {
    it('should not include duplicate offsets in default timezone selection', async () => {
      // Import TimelineManager using ES module syntax
      const { TimelineManager } = await import('../src/scripts/index.js');
      
      // Create a container element for the timeline
      const container = document.createElement('div');
      container.id = 'timeline-container';
      document.body.appendChild(container);
      
      // Create modal elements that TimelineManager expects
      const modal = document.createElement('div');
      modal.id = 'timezone-modal';
      document.body.appendChild(modal);
      
      const overlay = document.createElement('div');
      overlay.id = 'timezone-modal-overlay';
      document.body.appendChild(overlay);
      
      const input = document.createElement('input');
      input.id = 'timezone-input';
      document.body.appendChild(input);
      
      const wheel = document.createElement('div');
      wheel.id = 'timezone-wheel';
      document.body.appendChild(wheel);
      
      const selectButton = document.createElement('button');
      selectButton.id = 'select-timezone';
      document.body.appendChild(selectButton);
      
      const cancelButton = document.createElement('button');
      cancelButton.id = 'cancel-timezone';
      document.body.appendChild(cancelButton);
      
      const closeButton = document.createElement('button');
      closeButton.className = 'modal-close';
      modal.appendChild(closeButton);
      
      const upButton = document.createElement('button');
      upButton.id = 'wheel-up';
      document.body.appendChild(upButton);
      
      const downButton = document.createElement('button');
      downButton.id = 'wheel-down';
      document.body.appendChild(downButton);
      
      try {
        const manager = new TimelineManager();
        
        // Access the selected timezones
        const selectedTimezones = manager.selectedTimezones || [];
        
        // Check that no two timezones have the same offset
        const offsets = selectedTimezones.map((tz: any) => tz.offset);
        const uniqueOffsets = [...new Set(offsets)];
        
        expect(uniqueOffsets.length).toBe(offsets.length);
        
        // Clean up
        document.body.removeChild(container);
        document.body.removeChild(modal);
        document.body.removeChild(overlay);
        document.body.removeChild(input);
        document.body.removeChild(wheel);
        document.body.removeChild(selectButton);
        document.body.removeChild(cancelButton);
        document.body.removeChild(upButton);
        document.body.removeChild(downButton);
      } catch (error) {
        // Clean up even if test fails
        [container, modal, overlay, input, wheel, selectButton, cancelButton, upButton, downButton].forEach(el => {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
        throw error;
      }
    });
  });
});