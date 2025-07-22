/**
 * Timezone Overlap Visualizer - Main Module
 *
 * Core timezone visualization functionality including timeline rendering,
 * user interactions, and daylight calculations using SunCalc.
 */

import * as SunCalc from 'suncalc';
import { SettingsPanel } from './settings.js';

// Type definitions for timezone and timeline data structures

/** Daylight calculation data for a specific timezone and time */
export interface DaylightData {
  isDaylight: boolean;
  sunrise: Date;
  sunset: Date;
  coordinates: { latitude: number; longitude: number };
  city: string;
}

/** Timezone information with offset and display details */
export interface TimeZone {
  name: string; // City name from IANA identifier
  offset: number; // UTC offset in hours
  displayName: string; // Full localized name
  iana: string; // IANA timezone identifier
  cityName: string; // Extracted city name for display and search
  abbreviation: string; // Timezone abbreviation (e.g., "EDT", "JST")
  daylight?: DaylightData;
}

/**
 * Options for timezone list generation
 * Controls how many timezones to include and responsive behavior
 */
export interface TimeZoneListOptions {
  minTimezones?: number; // Minimum number of timezones to include
  screenPixels?: number; // Screen width in pixels for responsive calculations
}

/** Individual hour in the timeline display */
export interface TimelineHour {
  hour: number;
  date: Date;
  time12: string; // "2 PM"
  time24: string; // "14"
  isDaylight?: boolean;
}

/** Complete timeline row for a single timezone */
export interface TimelineRow {
  timezone: TimeZone;
  hours: TimelineHour[];
  isUserTimezone: boolean;
}

/**
 * Get user's current timezone using Intl API
 * @returns TimeZone object with user's timezone details
 */
export function getUserTimezone(): TimeZone {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: userTimezone,
    timeZoneName: 'longOffset',
  });

  const offsetStr = formatter.formatToParts(now).find(part => part.type === 'timeZoneName')?.value || '+00:00';

  // Parse offset string like "GMT+05:30" or "GMT-08:00"
  const offsetMatch = offsetStr.match(/GMT([+-])(\d{2}):(\d{2})/);
  let offset = 0;
  if (offsetMatch && offsetMatch[2] && offsetMatch[3]) {
    const sign = offsetMatch[1] === '+' ? 1 : -1;
    const hours = parseInt(offsetMatch[2], 10);
    const minutes = parseInt(offsetMatch[3], 10);
    offset = sign * (hours + minutes / 60);
  }

  // Get display name
  const displayFormatter = new Intl.DateTimeFormat('en', {
    timeZone: userTimezone,
    timeZoneName: 'long',
  });
  const displayName =
    displayFormatter.formatToParts(now).find(part => part.type === 'timeZoneName')?.value || userTimezone;

  return {
    name: createTimezoneDisplayName(userTimezone, offset),
    offset,
    displayName,
    iana: userTimezone,
    cityName: extractCityName(userTimezone),
    abbreviation: getTimezoneAbbreviation(displayName, userTimezone),
  };
}

/**
 * Get a selection of major world timezones centered around user's timezone
 * @param numRows Number of timezone rows to display (default: 5)
 * @returns Array of timezone objects centered around user's timezone
 */
export function getTimezonesForTimeline(numRows = 5): TimeZone[] {
  const userTz = getUserTimezone();

  // Use a selection of major timezones that have coordinates for daylight calculations
  const majorTimezones = [
    'Pacific/Honolulu', // UTC-10
    'America/Anchorage', // UTC-9
    'America/Los_Angeles', // UTC-8
    'America/Denver', // UTC-7
    'America/Chicago', // UTC-6
    'America/New_York', // UTC-5
    'America/Toronto', // UTC-5
    'Europe/London', // UTC+0/+1
    'Europe/Paris', // UTC+1/+2
    'Europe/Berlin', // UTC+1/+2
    'Europe/Rome', // UTC+1/+2
    'Europe/Moscow', // UTC+3
    'Asia/Dubai', // UTC+4
    'Asia/Kolkata', // UTC+5:30
    'Asia/Shanghai', // UTC+8
    'Asia/Tokyo', // UTC+9
    'Australia/Sydney', // UTC+10/+11
    'Pacific/Auckland', // UTC+12/+13
  ];

  // Convert IANA timezone identifiers to TimeZone objects
  const timezones: TimeZone[] = majorTimezones.map(iana => {
    const now = new Date();

    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: iana,
      timeZoneName: 'longOffset',
    });

    const offsetStr = formatter.formatToParts(now).find(part => part.type === 'timeZoneName')?.value || '+00:00';

    // Parse offset string like "GMT+05:30" or "GMT-08:00"
    const offsetMatch = offsetStr.match(/GMT([+-])(\d{2}):(\d{2})/);
    let offset = 0;
    if (offsetMatch && offsetMatch[2] && offsetMatch[3]) {
      const sign = offsetMatch[1] === '+' ? 1 : -1;
      const hours = parseInt(offsetMatch[2], 10);
      const minutes = parseInt(offsetMatch[3], 10);
      offset = sign * (hours + minutes / 60);
    }

    // Get display name
    const displayFormatter = new Intl.DateTimeFormat('en', {
      timeZone: iana,
      timeZoneName: 'long',
    });
    const displayName = displayFormatter.formatToParts(now).find(part => part.type === 'timeZoneName')?.value || iana;

    return {
      name: createTimezoneDisplayName(iana, offset),
      offset,
      displayName,
      iana,
      cityName: extractCityName(iana),
      abbreviation: getTimezoneAbbreviation(displayName, iana),
    };
  });

  // Find user's timezone in the list or add it
  const userTimezoneMatch = timezones.find(tz => tz.iana === userTz.iana);
  if (!userTimezoneMatch) {
    timezones.unshift(userTz);
  }

  // Sort by offset to show a nice progression
  timezones.sort((a, b) => a.offset - b.offset);

  // Take a selection centered around user's timezone
  const userIndex = timezones.findIndex(tz => tz.iana === userTz.iana);
  const start = Math.max(0, userIndex - Math.floor(numRows / 2));
  const end = Math.min(timezones.length, start + numRows);

  return timezones.slice(start, end);
}

/**
 * Extract and format city name from IANA timezone identifier
 * @param iana IANA timezone identifier (e.g., "America/New_York")
 * @returns Formatted city name (e.g., "New York")
 */
function extractCityName(iana: string): string {
  // Extract the city part from IANA identifier (everything after the last slash)
  const parts = iana.split('/');
  const cityPart = parts[parts.length - 1];

  // Handle case where cityPart might be undefined or empty
  if (!cityPart) {
    return iana; // Fallback to full IANA identifier
  }

  // Replace underscores with spaces
  let cityName = cityPart.replace(/_/g, ' ');

  // Convert to proper case for better readability
  cityName = cityName.replace(/\b\w/g, letter => letter.toUpperCase());

  // Handle specific corrections that require special characters or can't be done algorithmically
  const corrections: Record<string, string> = {
    'Sao Paulo': 'São Paulo',
    'Ho Chi Minh': 'Ho Chi Minh City',
    'Port Of Spain': 'Port of Spain',
  };

  return corrections[cityName] || cityName;
}

/**
 * Generate timezone abbreviation from full timezone name and IANA identifier
 * @param displayName Full timezone name (e.g., "Eastern Daylight Time")
 * @param iana IANA timezone identifier for fallback logic
 * @returns Timezone abbreviation (e.g., "EDT")
 */
function getTimezoneAbbreviation(displayName: string, iana: string): string {
  try {
    // Use browser's Intl.DateTimeFormat to get timezone abbreviation in user's native language
    const formatter = new Intl.DateTimeFormat(undefined, {
      timeZone: iana,
      timeZoneName: 'short',
    });

    // Format a date and extract the timezone abbreviation
    const parts = formatter.formatToParts(new Date());
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');

    if (timeZonePart && timeZonePart.value && timeZonePart.value.length <= 5) {
      return timeZonePart.value;
    }
  } catch {
    // Fall through to fallback logic
  }

  // Fallback for UTC
  if (iana.startsWith('UTC') || iana === 'Etc/UTC' || iana === 'Etc/GMT') {
    return 'UTC';
  }

  // Fallback: generate abbreviation from display name
  const words = displayName
    .split(' ')
    .filter(word => word.length > 0 && !['of', 'and', 'the', 'in'].includes(word.toLowerCase()));

  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map(word => word[0])
      .join('')
      .toUpperCase();
  }

  // Ultimate fallback
  return 'GMT';
}

/**
 * Create a timezone display name using browser's native localization
 * @param iana IANA timezone identifier
 * @param offset UTC offset in hours (fallback for display)
 * @returns Browser-localized timezone name
 */
function createTimezoneDisplayName(iana: string, offset: number): string {
  try {
    // Use browser's native timezone display names in user's language
    const formatter = new Intl.DateTimeFormat(undefined, {
      timeZone: iana,
      timeZoneName: 'long',
    });

    // Get the timezone name from a sample date
    const parts = formatter.formatToParts(new Date());
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');

    if (timeZonePart && timeZonePart.value) {
      return timeZonePart.value;
    }
  } catch {
    // If the IANA timezone is not supported, fall back to UTC offset
    console.warn(`Timezone ${iana} not supported by browser, falling back to UTC offset`);
  }

  // Fallback to UTC offset format
  const offsetStr = formatOffset(offset);
  return `UTC${offsetStr}`;
}

/**
 * Format UTC offset for display
 * @param offset UTC offset in hours
 * @returns Formatted offset string (e.g., "+5:30", "-7", "+12:45")
 */
function formatOffset(offset: number): string {
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hours = Math.floor(absOffset);
  const minutes = Math.round((absOffset - hours) * 60);

  // If minutes are zero, don't include them
  if (minutes === 0) {
    return `${sign}${hours}`;
  }

  // Include minutes when they're non-zero, but don't pad hours with zero
  return `${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Generate timeline hours for display
 * @param numHours Number of hours to display in the timeline
 * @param timezone Target timezone to calculate hours for
 * @returns Array of timeline hours with daylight information
 */
export function generateTimelineHours(numHours: number, timezone: TimeZone): TimelineHour[] {
  const now = new Date();
  const userTz = getUserTimezone();

  // Get current hour in user's timezone and round down
  const currentUserHour = new Date(now.toLocaleString('en-US', { timeZone: userTz.iana }));
  currentUserHour.setMinutes(0, 0, 0);

  const hours: TimelineHour[] = [];

  for (let i = 0; i < numHours; i++) {
    // Calculate the time in the target timezone
    const baseTime = new Date(currentUserHour.getTime() + i * 60 * 60 * 1000);
    const offsetDiff = (timezone.offset - userTz.offset) * 60 * 60 * 1000;
    const timeInTz = new Date(baseTime.getTime() + offsetDiff);

    const hour12 = timeInTz.toLocaleString('en-US', {
      hour: 'numeric',
      hour12: true,
    });

    const hour24 = timeInTz.toLocaleString('en-US', {
      hour: '2-digit',
      hour12: false,
    });

    // Calculate daylight status for this hour
    const isDaylight = isHourInDaylight(timezone, timeInTz);

    hours.push({
      hour: timeInTz.getHours(),
      date: timeInTz,
      time12: hour12,
      time24: hour24,
      isDaylight,
    });
  }

  return hours;
}

/**
 * Create timeline data for rendering
 * @param numHours - Number of hours to display
 * @param numRows - Number of timezone rows to display
 * @returns Array of timeline rows
 */
export function createTimelineData(numHours: number, numRows: number): TimelineRow[] {
  const userTz = getUserTimezone();
  const timezones = getTimezonesForTimeline(numRows);

  return timezones.map(timezone => ({
    timezone,
    hours: generateTimelineHours(numHours, timezone),
    isUserTimezone: timezone.iana === userTz.iana,
  }));
}

/**
 * Calculate responsive timeline dimensions based on screen size
 * @returns Object with numHours and numRows for timeline display
 */
export function getTimelineDimensions(): { numHours: number; numRows: number } {
  // Use window dimensions if available, otherwise fallback to defaults
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

  // Always show minimum 24 hours for better timeline visualization
  // This supports the requirement to always show at least 24 hours
  const numHours = 24;

  // Calculate number of rows based on available height
  // Minimum 3 rows, but try to fill the screen
  const headerHeight = 120; // Approximate header height
  const footerHeight = 80; // Approximate footer height
  const availableHeight = screenHeight - headerHeight - footerHeight;
  const rowHeight = 80; // Approximate row height

  let numRows = Math.max(3, Math.floor(availableHeight / rowHeight));
  numRows = Math.min(numRows, 12); // Maximum 12 rows

  return { numHours, numRows };
}

/**
 * Dynamically adjust timezone label widths based on content
 */
function adjustTimezoneLabelWidths(): void {
  const timezoneLabelCells = document.querySelectorAll('.timeline-timezone-label');
  if (timezoneLabelCells.length === 0) return;

  const firstCell = timezoneLabelCells[0] as HTMLElement;
  if (!firstCell) return;

  // Create a temporary element to measure text widths
  const tempElement = document.createElement('div');
  tempElement.style.position = 'absolute';
  tempElement.style.visibility = 'hidden';
  tempElement.style.whiteSpace = 'nowrap';
  tempElement.style.fontSize = window.getComputedStyle(firstCell).fontSize;
  tempElement.style.fontFamily = window.getComputedStyle(firstCell).fontFamily;
  tempElement.style.fontWeight = window.getComputedStyle(firstCell).fontWeight;
  document.body.appendChild(tempElement);

  let maxWidth = 0;

  // Measure the content width of each timezone label
  timezoneLabelCells.forEach(cell => {
    const timezoneInfo = cell.querySelector('.timezone-info');
    if (timezoneInfo) {
      tempElement.innerHTML = timezoneInfo.innerHTML;
      const contentWidth = tempElement.scrollWidth;
      maxWidth = Math.max(maxWidth, contentWidth);
    }
  });

  // Remove temporary element
  document.body.removeChild(tempElement);

  // Add padding and set minimum widths based on screen size
  const screenWidth = window.innerWidth;
  const padding = 32; // Account for padding and margins
  let minWidth: number;

  if (screenWidth <= 576) {
    minWidth = 140; // Mobile minimum
  } else if (screenWidth <= 768) {
    minWidth = 180; // Base minimum
  } else if (screenWidth <= 992) {
    minWidth = 200; // Tablet minimum
  } else if (screenWidth <= 1400) {
    minWidth = 220; // Desktop minimum
  } else {
    minWidth = 240; // Large desktop minimum
  }

  // Calculate optimal width (content + padding, but at least minimum)
  const optimalWidth = Math.max(maxWidth + padding, minWidth);

  // Apply the calculated width to all timezone label cells
  timezoneLabelCells.forEach(cell => {
    (cell as HTMLElement).style.minWidth = `${optimalWidth}px`;
    (cell as HTMLElement).style.width = `${optimalWidth}px`;
  });

  console.log(`Adjusted timezone label width to ${optimalWidth}px (content: ${maxWidth}px, min: ${minWidth}px)`);
}

/**
 * Render the timeline visualization
 */
export function renderTimeline(): void {
  const container = document.getElementById('timeline-container');
  if (!container) {
    console.error('Timeline container not found');
    return;
  }

  const { numHours, numRows } = getTimelineDimensions();

  // Get current time format setting
  const settings = SettingsPanel.getCurrentSettings();
  const timeFormat = settings?.timeFormat || '12h';

  const timelineData = createTimelineData(numHours, numRows);

  // Clear container
  container.innerHTML = '';

  // Create timeline rows
  timelineData.forEach(row => {
    const rowElement = document.createElement('div');
    rowElement.className = 'timeline-row';

    if (row.isUserTimezone) {
      rowElement.classList.add('user-timezone');
    }

    // Timezone label
    const labelCell = document.createElement('div');
    labelCell.className = 'timeline-cell timeline-timezone-label';
    labelCell.innerHTML = `
      <div class="timezone-info">
        <div class="timezone-name">${extractCityName(row.timezone.iana)}</div>
        <div class="timezone-offset">${row.timezone.displayName} (${formatOffset(row.timezone.offset)})</div>
      </div>
    `;
    rowElement.appendChild(labelCell);

    // Hour cells
    row.hours.forEach((hour, index) => {
      const hourCell = document.createElement('div');
      hourCell.className = 'timeline-cell timeline-hour';
      // Use consistent format based on setting
      hourCell.textContent = timeFormat === '12h' ? hour.time12 : hour.time24;

      // Mark current hour
      if (index === 0) {
        hourCell.classList.add('current-hour');
      }

      // Add working hours class (9 AM to 5 PM)
      if (hour.hour >= 9 && hour.hour < 17) {
        hourCell.classList.add('working-hours');
      }

      // Add daylight/night indicator
      if (hour.isDaylight !== undefined) {
        if (hour.isDaylight) {
          hourCell.classList.add('daylight-hour');
          hourCell.title = 'Daylight hours';
        } else {
          hourCell.classList.add('night-hour');
          hourCell.title = 'Night hours';
        }
      }

      rowElement.appendChild(hourCell);
    });

    container.appendChild(rowElement);
  });

  // Apply dynamic width calculation after all rows are rendered
  adjustTimezoneLabelWidths();
}

/**
 * Timeline Manager - Orchestrates timezone timeline visualization
 */
export class TimelineManager {
  private container: HTMLElement;
  private modal: TimezoneModal;
  private selectedTimezones: TimeZone[] = [];

  constructor() {
    this.container = document.getElementById('timeline-container') as HTMLElement;
    if (!this.container) {
      throw new Error('Timeline container not found');
    }

    // Initialize modal with callback
    this.modal = new TimezoneModal((timezone: TimeZone) => this.addTimezone(timezone));

    // Initialize with user's timezone and a few others
    this.initializeDefaultTimezones();

    // Listen for settings changes to refresh timeline
    window.addEventListener('settingsChanged', () => {
      this.renderTimeline();
    });
  }

  private initializeDefaultTimezones(): void {
    const userTz = getUserTimezone();
    this.selectedTimezones = [userTz];

    // Add a few timezones around the world for demonstration
    const additionalTimezones = getTimezonesForTimeline(5);
    additionalTimezones.forEach(tz => {
      // Check for both duplicate IANA identifiers and duplicate offsets
      const isDuplicateIana = this.selectedTimezones.find(selected => selected.iana === tz.iana);
      const isDuplicateOffset = this.selectedTimezones.find(selected => selected.offset === tz.offset);

      if (!isDuplicateIana && !isDuplicateOffset) {
        this.selectedTimezones.push(tz);
      }
    });

    this.renderTimeline();
  }

  public addTimezone(timezone: TimeZone): void {
    // Check if timezone already exists
    const exists = this.selectedTimezones.find(tz => tz.iana === timezone.iana);
    if (!exists) {
      this.selectedTimezones.push(timezone);
      this.renderTimeline();
    }
  }

  public removeTimezone(timezone: TimeZone): void {
    this.selectedTimezones = this.selectedTimezones.filter(tz => tz.iana !== timezone.iana);
    this.renderTimeline();
  }

  public openTimezoneModal(): void {
    this.modal.open();
  }

  public refresh(): void {
    this.renderTimeline();
  }

  private renderTimeline(): void {
    const { numHours } = getTimelineDimensions();

    // Get current time format setting
    const settings = SettingsPanel.getCurrentSettings();
    const timeFormat = settings?.timeFormat || '12h';

    // Clear container
    this.container.innerHTML = '';

    // Create add timezone button
    const addButton = document.createElement('button');
    addButton.className = 'button add-timezone-btn';
    addButton.textContent = '+ Add Timezone';
    addButton.addEventListener('click', () => this.openTimezoneModal());

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'timeline-controls';
    buttonContainer.appendChild(addButton);
    this.container.appendChild(buttonContainer);

    // Create timeline rows for selected timezones, sorted by offset
    const sortedTimezones = [...this.selectedTimezones].sort((a, b) => a.offset - b.offset);
    sortedTimezones.forEach(timezone => {
      const rowElement = document.createElement('div');
      rowElement.className = 'timeline-row';

      const userTz = getUserTimezone();
      if (timezone.iana === userTz.iana) {
        rowElement.classList.add('user-timezone');
      }

      // Timezone label with remove button
      const labelCell = document.createElement('div');
      labelCell.className = 'timeline-cell timeline-timezone-label';
      labelCell.innerHTML = `
        <div class="timezone-info">
          <div class="timezone-name">${extractCityName(timezone.iana)}</div>
          <div class="timezone-offset">${timezone.displayName} (${formatOffset(timezone.offset)})</div>
        </div>
        <button class="remove-timezone-btn" title="Remove timezone">×</button>
      `;

      // Add remove button functionality
      const removeButton = labelCell.querySelector('.remove-timezone-btn') as HTMLElement;
      removeButton.addEventListener('click', () => this.removeTimezone(timezone));

      rowElement.appendChild(labelCell);

      // Hour cells
      const timezoneHours = generateTimelineHours(numHours, timezone);
      timezoneHours.forEach((hour, index) => {
        const hourCell = document.createElement('div');
        hourCell.className = 'timeline-cell timeline-hour';
        // Use consistent format based on setting
        hourCell.textContent = timeFormat === '12h' ? hour.time12 : hour.time24;

        // Mark current hour
        if (index === 0) {
          hourCell.classList.add('current-hour');
        }

        // Add working hours class (9 AM to 5 PM)
        if (hour.hour >= 9 && hour.hour < 17) {
          hourCell.classList.add('working-hours');
        }

        rowElement.appendChild(hourCell);
      });

      this.container.appendChild(rowElement);
    });

    // Apply dynamic width calculation after all rows are rendered
    adjustTimezoneLabelWidths();
  }
}

/**
 * Global timeline manager instance
 */
let timelineManager: TimelineManager;

/**
 * Initialize timeline and set up responsive handling
 */
export function initializeTimeline(): void {
  console.log('Initializing timeline visualization with modal integration');

  try {
    // Initialize timeline manager
    timelineManager = new TimelineManager();

    // Re-render on window resize
    let resizeTimeout: number;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        if (timelineManager) {
          // Re-render timeline with new dimensions
          timelineManager.refresh();
        }
      }, 250);
    });
  } catch (error) {
    console.error('Error initializing timeline manager:', error);
    // Fallback to original timeline rendering
    renderTimeline();
  }
}

// Make initializeTimeline available globally
interface WindowWithTimeline extends Window {
  initializeTimeline?: () => void;
}

(window as WindowWithTimeline).initializeTimeline = initializeTimeline;

/**
 * Get all supported timezones that the browser knows about,
 * ordered starting with the user's current timezone and going around the world
 * @returns Array of timezone objects ordered from user's timezone around the globe
 */
export function getAllTimezonesOrdered(): TimeZone[] {
  // Get user's current timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();

  // Get all supported timezones
  const allTimezones = Intl.supportedValuesOf('timeZone');

  // Create timezone objects with current offsets
  const timezoneData = allTimezones.map(iana => {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: iana,
      timeZoneName: 'longOffset',
    });

    const offsetStr = formatter.formatToParts(now).find(part => part.type === 'timeZoneName')?.value || '+00:00';

    // Parse offset string like "GMT+05:30" or "GMT-08:00"
    const offsetMatch = offsetStr.match(/GMT([+-])(\d{2}):(\d{2})/);
    let offset = 0;
    if (offsetMatch && offsetMatch[2] && offsetMatch[3]) {
      const sign = offsetMatch[1] === '+' ? 1 : -1;
      const hours = parseInt(offsetMatch[2], 10);
      const minutes = parseInt(offsetMatch[3], 10);
      offset = sign * (hours + minutes / 60);
    }

    // Get display name
    const displayFormatter = new Intl.DateTimeFormat('en', {
      timeZone: iana,
      timeZoneName: 'long',
    });
    const displayName = displayFormatter.formatToParts(now).find(part => part.type === 'timeZoneName')?.value || iana;

    return {
      name: createTimezoneDisplayName(iana, offset),
      offset,
      displayName,
      iana,
      cityName: extractCityName(iana),
      abbreviation: getTimezoneAbbreviation(displayName, iana),
    };
  });

  // Get user's timezone offset
  const userTimezoneData = timezoneData.find(tz => tz.iana === userTimezone);
  const userOffset = userTimezoneData?.offset || 0;

  // Sort timezones: start with user's timezone, then go around the world
  const sortedTimezones = timezoneData.sort((a, b) => {
    // Calculate distance from user's timezone, wrapping around
    const getDistance = (offset: number): number => {
      let distance = offset - userOffset;
      if (distance < -12) distance += 24;
      if (distance > 12) distance -= 24;
      return distance;
    };

    const distanceA = getDistance(a.offset);
    const distanceB = getDistance(b.offset);

    // Sort by distance, then by name for consistency
    if (distanceA !== distanceB) {
      return distanceA - distanceB;
    }
    return a.name.localeCompare(b.name);
  });

  return sortedTimezones;
}

/**
 * Timezone Selection Modal with search and wheel navigation
 */
export class TimezoneModal {
  private modal: HTMLElement;
  private overlay: HTMLElement;
  private input: HTMLInputElement;
  private wheel: HTMLElement;
  private selectButton: HTMLElement;
  private cancelButton: HTMLElement;
  private closeButton: HTMLElement;
  private upButton: HTMLElement;
  private downButton: HTMLElement;
  private timezones: TimeZone[];
  private filteredTimezones: TimeZone[];
  private selectedIndex = 0;
  private currentUserTimezone: string;
  private onTimezoneSelectedCallback: ((timezone: TimeZone) => void) | undefined;

  constructor(onTimezoneSelected?: (timezone: TimeZone) => void) {
    this.modal = document.getElementById('timezone-modal') as HTMLElement;
    this.overlay = document.getElementById('timezone-modal-overlay') as HTMLElement;
    this.input = document.getElementById('timezone-input') as HTMLInputElement;
    this.wheel = document.getElementById('timezone-wheel') as HTMLElement;
    this.selectButton = document.getElementById('select-timezone') as HTMLElement;
    this.cancelButton = document.getElementById('cancel-timezone') as HTMLElement;
    this.closeButton = this.modal.querySelector('.modal-close') as HTMLElement;
    this.upButton = document.getElementById('wheel-up') as HTMLElement;
    this.downButton = document.getElementById('wheel-down') as HTMLElement;

    this.currentUserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.timezones = getAllTimezonesOrdered();
    this.filteredTimezones = [...this.timezones];
    this.onTimezoneSelectedCallback = onTimezoneSelected;

    this.init();
  }

  private init(): void {
    // Set default timezone to user's current timezone
    const userTimezoneIndex = this.timezones.findIndex(tz => tz.iana === this.currentUserTimezone);
    if (userTimezoneIndex !== -1) {
      this.selectedIndex = userTimezoneIndex;
    }

    // Set input value
    this.updateInputValue();

    // Event listeners
    this.input.addEventListener('input', () => this.handleInputChange());
    this.selectButton.addEventListener('click', () => this.handleSelect());
    this.cancelButton.addEventListener('click', () => this.close());
    this.closeButton.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', e => this.handleOverlayClick(e));
    this.upButton.addEventListener('click', () => this.navigateUp());
    this.downButton.addEventListener('click', () => this.navigateDown());

    // Keyboard navigation
    this.modal.addEventListener('keydown', e => this.handleKeyDown(e));

    // Render initial wheel
    this.renderWheel();
  }

  private handleInputChange(): void {
    const query = this.input.value.toLowerCase();

    if (query === '') {
      this.filteredTimezones = [...this.timezones];
    } else {
      this.filteredTimezones = this.timezones.filter(
        tz =>
          tz.displayName.toLowerCase().includes(query) ||
          tz.name.toLowerCase().includes(query) ||
          tz.iana.toLowerCase().includes(query) ||
          tz.cityName.toLowerCase().includes(query) ||
          tz.abbreviation.toLowerCase().includes(query),
      );
    }

    // Reset to first item in filtered results
    this.selectedIndex = 0;
    this.renderWheel();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      this.navigateUp();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      this.navigateDown();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.handleSelect();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    }
  }

  private navigateUp(): void {
    this.selectedIndex = (this.selectedIndex - 1 + this.filteredTimezones.length) % this.filteredTimezones.length;
    this.updateInputValue();
    this.renderWheel();
  }

  private navigateDown(): void {
    this.selectedIndex = (this.selectedIndex + 1) % this.filteredTimezones.length;
    this.updateInputValue();
    this.renderWheel();
  }

  private updateInputValue(): void {
    const selectedTimezone = this.filteredTimezones[this.selectedIndex];
    if (selectedTimezone) {
      // Format offset
      const offsetStr = formatOffset(selectedTimezone.offset);
      // Show city name with abbreviated timezone and offset: "Tokyo (JST +09:00)"
      this.input.value = `${selectedTimezone.cityName} (${selectedTimezone.abbreviation} ${offsetStr})`;
    }
  }

  private renderWheel(): void {
    this.wheel.innerHTML = '';

    if (this.filteredTimezones.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'wheel-timezone-item center';
      noResults.innerHTML = '<div class="wheel-timezone-name">No timezones found</div>';
      this.wheel.appendChild(noResults);
      return;
    }

    // Show 5 items: 2 above, current (center), 2 below
    const itemsToShow = 5;
    const centerIndex = Math.floor(itemsToShow / 2); // Index 2 (0-based)

    for (let i = 0; i < itemsToShow; i++) {
      const timezoneIndex =
        (this.selectedIndex - centerIndex + i + this.filteredTimezones.length) % this.filteredTimezones.length;
      const timezone = this.filteredTimezones[timezoneIndex];

      if (!timezone) continue;

      const item = document.createElement('div');
      item.className = 'wheel-timezone-item';

      // Add position classes
      if (i === centerIndex) {
        item.classList.add('center');
      } else if (i === centerIndex - 1 || i === centerIndex + 1) {
        item.classList.add('adjacent');
      } else {
        item.classList.add('distant');
      }

      // Add current user timezone class
      if (timezone.iana === this.currentUserTimezone) {
        item.classList.add('current');
      }

      // Format offset for display using the existing formatOffset function
      const offsetStr = formatOffset(timezone.offset);

      item.innerHTML = `
        <div class="wheel-timezone-name">${timezone.cityName} (${timezone.abbreviation} ${offsetStr})</div>
        <div class="wheel-timezone-display">${timezone.displayName}</div>
      `;

      // Click handler to select this timezone
      item.addEventListener('click', () => {
        if (i !== centerIndex) {
          // Navigate to this timezone
          const steps = i - centerIndex;
          if (steps > 0) {
            for (let j = 0; j < steps; j++) {
              this.navigateDown();
            }
          } else {
            for (let j = 0; j < Math.abs(steps); j++) {
              this.navigateUp();
            }
          }
        }
      });

      this.wheel.appendChild(item);
    }
  }

  private handleSelect(): void {
    const selectedTimezone = this.filteredTimezones[this.selectedIndex];
    if (selectedTimezone) {
      console.log('Selected timezone:', selectedTimezone);
      if (this.onTimezoneSelectedCallback) {
        this.onTimezoneSelectedCallback(selectedTimezone);
      }
      this.close();
    }
  }

  private handleOverlayClick(event: Event): void {
    if (event.target === this.overlay) {
      this.close();
    }
  }

  public open(): void {
    this.overlay.classList.add('active');
    this.modal.focus();
    document.body.style.overflow = 'hidden';
  }

  public close(): void {
    this.overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  public getSelectedTimezone(): TimeZone | null {
    return this.filteredTimezones[this.selectedIndex] || null;
  }
}

/**
 * Predefined coordinates for major timezone cities used for daylight calculations
 */
const TIMEZONE_COORDINATES: Record<string, { latitude: number; longitude: number; city: string }> = {
  // Americas - Major populated cities
  'America/New_York': { latitude: 40.7128, longitude: -74.006, city: 'New York City' },
  'America/Chicago': { latitude: 41.8781, longitude: -87.6298, city: 'Chicago' },
  'America/Denver': { latitude: 39.7392, longitude: -104.9903, city: 'Denver' },
  'America/Los_Angeles': { latitude: 34.0522, longitude: -118.2437, city: 'Los Angeles' },
  'America/Phoenix': { latitude: 33.4484, longitude: -112.074, city: 'Phoenix' },
  'America/Anchorage': { latitude: 61.2181, longitude: -149.9003, city: 'Anchorage' },
  'America/Toronto': { latitude: 43.6532, longitude: -79.3832, city: 'Toronto' },
  'America/Mexico_City': { latitude: 19.4326, longitude: -99.1332, city: 'Mexico City' },

  // Europe - Major populated cities
  'Europe/London': { latitude: 51.5074, longitude: -0.1278, city: 'London' },
  'Europe/Paris': { latitude: 48.8566, longitude: 2.3522, city: 'Paris' },
  'Europe/Berlin': { latitude: 52.52, longitude: 13.405, city: 'Berlin' },
  'Europe/Rome': { latitude: 41.9028, longitude: 12.4964, city: 'Rome' },
  'Europe/Madrid': { latitude: 40.4168, longitude: -3.7038, city: 'Madrid' },
  'Europe/Moscow': { latitude: 55.7558, longitude: 37.6176, city: 'Moscow' },

  // Asia - Major populated cities
  'Asia/Tokyo': { latitude: 35.6762, longitude: 139.6503, city: 'Tokyo' },
  'Asia/Shanghai': { latitude: 31.2304, longitude: 121.4737, city: 'Shanghai' },
  'Asia/Hong_Kong': { latitude: 22.3193, longitude: 114.1694, city: 'Hong Kong' },
  'Asia/Singapore': { latitude: 1.3521, longitude: 103.8198, city: 'Singapore' },
  'Asia/Seoul': { latitude: 37.5665, longitude: 126.978, city: 'Seoul' },
  'Asia/Kolkata': { latitude: 22.5726, longitude: 88.3639, city: 'Kolkata' },
  'Asia/Dubai': { latitude: 25.2048, longitude: 55.2708, city: 'Dubai' },

  // Australia/Pacific - Major populated cities
  'Australia/Sydney': { latitude: -33.8688, longitude: 151.2093, city: 'Sydney' },
  'Australia/Melbourne': { latitude: -37.8136, longitude: 144.9631, city: 'Melbourne' },
  'Pacific/Auckland': { latitude: -36.8485, longitude: 174.7633, city: 'Auckland' },
  'Pacific/Honolulu': { latitude: 21.3099, longitude: -157.8581, city: 'Honolulu' },

  // Africa - Major populated cities
  'Africa/Cairo': { latitude: 30.0444, longitude: 31.2357, city: 'Cairo' },
  'Africa/Lagos': { latitude: 6.5244, longitude: 3.3792, city: 'Lagos' },
  'Africa/Johannesburg': { latitude: -26.2041, longitude: 28.0473, city: 'Johannesburg' },
};

/**
 * Calculate if a specific hour in a timezone is during daylight using SunCalc
 * @param timezone Timezone to check (must have entry in TIMEZONE_COORDINATES)
 * @param hourDate Date/time to check for daylight status
 * @returns true if hour is during daylight, false if night or no coordinates available
 */
function isHourInDaylight(timezone: TimeZone, hourDate: Date): boolean {
  // Only calculate for timezones we have coordinates for
  const coordinates = TIMEZONE_COORDINATES[timezone.iana];
  if (!coordinates) {
    return false; // Default to night for unmapped timezones
  }

  const { latitude, longitude } = coordinates;

  try {
    // Get sun times for the date at the coordinates
    const sunTimes = SunCalc.getTimes(hourDate, latitude, longitude);

    // Convert to local time in the timezone
    const sunriseLocal = new Date(sunTimes.sunrise.toLocaleString('en-US', { timeZone: timezone.iana }));
    const sunsetLocal = new Date(sunTimes.sunset.toLocaleString('en-US', { timeZone: timezone.iana }));
    const hourLocal = new Date(hourDate.toLocaleString('en-US', { timeZone: timezone.iana }));

    // Check if the hour is between sunrise and sunset
    return hourLocal >= sunriseLocal && hourLocal <= sunsetLocal;
  } catch {
    // Fallback to simple calculation if SunCalc fails
    return simpleIsDaylight(coordinates.latitude, hourDate);
  }
}

/**
 * Simple daylight calculation fallback (approximation)
 */
function simpleIsDaylight(latitude: number, date: Date): boolean {
  const hour = date.getHours();

  // Very basic approximation: adjust for latitude
  // This is a simplified model, not astronomically accurate
  const baseRise = 6;
  const baseSet = 18;

  // Adjust for latitude (very rough approximation)
  const latAdjustment = Math.abs(latitude) * 0.05;

  let sunrise = baseRise - latAdjustment;
  let sunset = baseSet + latAdjustment;

  // Keep within reasonable bounds
  sunrise = Math.max(4, Math.min(8, sunrise));
  sunset = Math.max(16, Math.min(20, sunset));

  return hour >= sunrise && hour <= sunset;
}
