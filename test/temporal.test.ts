import { describe, it, expect } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';

describe('Temporal API', () => {
  describe('basic functionality', () => {
    it('should have Temporal available', () => {
      expect(typeof Temporal).toBe('object');
      expect(Temporal).toBeDefined();
    });

    it('should have expected Temporal components', () => {
      const temporalKeys = Object.keys(Temporal);
      expect(temporalKeys).toContain('Instant');
      expect(temporalKeys).toContain('Now');
      expect(temporalKeys).toContain('ZonedDateTime');
      expect(temporalKeys.length).toBeGreaterThan(0);
    });

    it('should have Now static methods', () => {
      const nowMethods = Object.getOwnPropertyNames(Temporal.Now);
      expect(nowMethods).toContain('instant');
      expect(nowMethods).toContain('timeZoneId');
      expect(nowMethods.length).toBeGreaterThan(0);
    });
  });

  describe('instant operations', () => {
    it('should create current instant', () => {
      const now = Temporal.Now.instant();
      expect(now).toBeInstanceOf(Temporal.Instant);
      expect(now.epochNanoseconds).toBeGreaterThan(0);
    });

    it('should create instant from epoch milliseconds', () => {
      const epoch = Temporal.Instant.fromEpochMilliseconds(0);
      expect(epoch.epochMilliseconds).toBe(0);
      expect(epoch.toString()).toBe('1970-01-01T00:00:00Z');
    });

    it('should have instant prototype methods', () => {
      const now = Temporal.Now.instant();
      const instantMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(now));
      expect(instantMethods).toContain('epochMilliseconds');
      expect(instantMethods).toContain('epochNanoseconds');
      expect(instantMethods).toContain('toString');
      expect(instantMethods).toContain('toZonedDateTimeISO');
    });
  });

  describe('timezone operations', () => {
    it('should work with instant to zoned datetime conversion', () => {
      const now = Temporal.Now.instant();
      
      expect(() => {
        const utcZoned = now.toZonedDateTimeISO('UTC');
        const tokyoZoned = now.toZonedDateTimeISO('Asia/Tokyo');
        
        // Verify we can call these methods without throwing
        expect(utcZoned).toBeDefined();
        expect(tokyoZoned).toBeDefined();
      }).not.toThrow();
    });

    it('should get current timezone ID', () => {
      expect(() => {
        const currentTimeZone = Temporal.Now.timeZoneId();
        expect(typeof currentTimeZone).toBe('string');
        expect(currentTimeZone.length).toBeGreaterThan(0);
      }).not.toThrow();
    });

    it('should handle timezone operations without errors', () => {
      expect(() => {
        const now = Temporal.Now.instant();
        const utcZoned = now.toZonedDateTimeISO('UTC');
        const tokyoZoned = now.toZonedDateTimeISO('Asia/Tokyo');
        
        // Test that these operations complete without throwing
        expect(utcZoned.toString()).toContain('+00:00[UTC]');
        expect(tokyoZoned.toString()).toContain('+09:00[Asia/Tokyo]');
      }).not.toThrow();
    });
  });
});