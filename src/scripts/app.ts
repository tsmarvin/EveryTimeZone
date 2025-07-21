/**
 * Application Initialization Module
 * Handles app startup and coordination between modules
 *
 * This module coordinates the initialization of:
 * - Settings panel (theme management with URL persistence)
 * - Timeline visualization (timezone overlap display)
 */

import { SettingsPanel } from './settings.js';
import { initializeTimeline } from './index.js';

/**
 * Initialize the timezone visualizer application
 * Sets up the settings panel for theme management and the main timeline visualization
 */
export function initializeApp(): void {
  console.log('Initializing timezone visualizer application');

  // Initialize settings panel which handles theme and mode selection via URL parameters
  // This provides the main appearance control interface in the header
  new SettingsPanel();

  // Initialize timeline visualization which handles timezone selection and timeline rendering
  // This includes the main timeline display, timezone modal, and responsive calculations
  initializeTimeline();
}

/**
 * Setup DOM content loaded event listener
 */
function setupDOMContentLoaded(): void {
  document.addEventListener('DOMContentLoaded', initializeApp);
}

// Auto-setup when module is loaded
if (document.readyState === 'loading') {
  setupDOMContentLoaded();
} else {
  // DOM is already loaded
  initializeApp();
}
