// Test script to understand Temporal API
import { Temporal } from '@js-temporal/polyfill';

console.log('Temporal version:', typeof Temporal);

// Test getting timezone IDs
try {
  // Get all timezone IDs
  const zones = Temporal.TimeZone.prototype.id; // This might not be the right way
  console.log('Timezone prototype:', Object.getOwnPropertyNames(Temporal.TimeZone.prototype));
  console.log('TimeZone static methods:', Object.getOwnPropertyNames(Temporal.TimeZone));
} catch (error) {
  console.log('Error accessing timezone IDs:', error.message);
}

// Test creating a timezone
try {
  const utc = Temporal.TimeZone.from('UTC');
  console.log('UTC timezone:', utc.id);
  
  const tokyo = Temporal.TimeZone.from('Asia/Tokyo');
  console.log('Tokyo timezone:', tokyo.id);
  
  // Get offset at current time
  const now = Temporal.Now.instant();
  const offset = tokyo.getOffsetNanosecondsFor(now);
  console.log('Tokyo offset (nanoseconds):', offset);
  console.log('Tokyo offset (hours):', offset / (1e9 * 3600));
  
} catch (error) {
  console.log('Error with timezone operations:', error.message);
}