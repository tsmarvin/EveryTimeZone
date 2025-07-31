// Global type declarations for the EveryTimeZone application

// Temporal polyfill global declaration
import type { Temporal as TemporalType } from '@js-temporal/polyfill';

declare global {
  // The temporal polyfill exposes Temporal as a global object
  const Temporal: typeof TemporalType;
}

export {};
