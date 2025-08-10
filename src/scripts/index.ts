/**
 * Timezone Overlap Visualizer - Main Module
 *
 * Core timezone visualization functionality including timeline rendering,
 * user interactions, and daylight calculations using SunCalc.
 */

import { SettingsPanel } from './settings.js';

// Temporal is available globally via the polyfill loaded in HTML
declare global {
  interface Window {
    Temporal: typeof import('@js-temporal/polyfill').Temporal;
    SunCalc: {
      getTimes: (date: Date, latitude: number, longitude: number) => { sunrise: Date; sunset: Date };
    }; // SunCalc library is loaded globally
  }
}

const Temporal = window.Temporal;
const SunCalc = window.SunCalc;

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
  isCustom?: boolean; // Flag to indicate custom timezone
  isOffCycle?: boolean; // Flag to indicate timezone was manually selected in off-cycle state (prevents auto DST switching)
  coordinates?: { latitude: number; longitude: number }; // Optional coordinates for custom timezones
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
  isDateTransition?: boolean; // true when this hour represents midnight (start of new day)
  dateString?: string | undefined; // formatted date string for display (e.g., "Aug 6")
  isSunriseHour?: boolean; // true when this hour marks the start of daylight
  isSunsetHour?: boolean; // true when this hour marks the start of night
  sunriseTime?: string | undefined; // formatted sunrise time (e.g., "6:42 AM")
  sunsetTime?: string | undefined; // formatted sunset time (e.g., "7:18 PM")
}

/** Complete timeline row for a single timezone */
export interface TimelineRow {
  timezone: TimeZone;
  hours: TimelineHour[];
  isUserTimezone: boolean;
}

/**
 * Get user's current timezone using Temporal API
 * @param date Optional date to calculate timezone offset for (defaults to current date)
 * @returns TimeZone object with user's timezone details for the specified date
 */
export function getUserTimezone(date?: Date): TimeZone {
  // Get user's timezone ID using Temporal (polyfill ensures availability)
  const userTimezone = Temporal.Now.timeZoneId();

  const now = date || new Date();

  // Use Intl for offset calculation (proven compatibility)
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

  // Get display name using Intl
  const displayFormatter = new Intl.DateTimeFormat('en', {
    timeZone: userTimezone,
    timeZoneName: 'long',
  });
  const displayName =
    displayFormatter.formatToParts(now).find(part => part.type === 'timeZoneName')?.value || userTimezone;

  return {
    name: createTimezoneDisplayName(userTimezone, offset, now),
    offset,
    displayName,
    iana: userTimezone,
    cityName: extractCityName(userTimezone),
    abbreviation: getTimezoneAbbreviation(displayName, userTimezone, now),
  };
}

/**
 * Get timezones with user's timezone in the center and random offsets around it
 * Enhanced to handle edge cases where user's timezone is at start/end of offset range
 *
 * @param numRows Number of timezone rows to display (default: 5, always uses odd numbers, minimum 3)
 * @param date Optional date to calculate timezone offsets for (defaults to current date)
 * @returns Array of timezone objects ordered by offset with user's actual timezone guaranteed in the center
 */
export function getTimezonesForTimeline(numRows = 5, date?: Date): TimeZone[] {
  const userTz = getUserTimezone(date);

  // Ensure we always use an odd number of timezones (minimum 3) so user timezone can be centered
  const oddNumRows = Math.max(3, numRows % 2 === 0 ? numRows + 1 : numRows);

  // Get all available timezones from the browser
  const allTimezones = getAllTimezonesOrdered(date);

  // Create a map of offset -> timezone for quick lookup
  const timezonesByOffset = new Map<number, TimeZone>();
  for (const timezone of allTimezones) {
    // Prioritize user's timezone for their offset, otherwise use first timezone found
    if (!timezonesByOffset.has(timezone.offset) || timezone.iana === userTz.iana) {
      timezonesByOffset.set(timezone.offset, timezone);
    }
  }

  // Generate random offsets around user's timezone with edge case handling
  const userOffset = userTz.offset;
  const targetTimezones: TimeZone[] = [];

  // Always add user's timezone first (it will be positioned correctly after sorting)
  targetTimezones.push(userTz);

  // Get all available offsets excluding the user's offset
  const availableOffsets = Array.from(timezonesByOffset.keys()).filter(offset => offset !== userOffset);

  // Separate offsets into those above and below user's offset
  const offsetsBelow = availableOffsets.filter(offset => offset < userOffset);
  const offsetsAbove = availableOffsets.filter(offset => offset > userOffset);

  // Sort by distance from user's offset for better selection
  offsetsBelow.sort((a, b) => userOffset - b - (userOffset - a)); // Closest first
  offsetsAbove.sort((a, b) => a - userOffset - (b - userOffset)); // Closest first

  // Handle edge cases: when user timezone is at start or end of offset range
  const slotsToFill = oddNumRows - 1; // Subtract 1 for user timezone already added

  // Only treat as edge case when we literally cannot center the user timezone
  // due to insufficient unique offsets. This should only happen for timezones
  // at the very edges of the international date line.
  const totalAvailableOffsets = offsetsBelow.length + offsetsAbove.length;
  const minRequiredForCentering = slotsToFill;

  // Check if we're at a TRUE edge case (insufficient total offsets to center user timezone)
  const isAtStartEdge = offsetsBelow.length === 0 && totalAvailableOffsets < minRequiredForCentering;
  const isAtEndEdge = offsetsAbove.length === 0 && totalAvailableOffsets < minRequiredForCentering;

  let selectedOffsets = new Set([userOffset]); // Track selected offsets to avoid duplicates

  if (isAtStartEdge || isAtEndEdge) {
    // Edge case: prioritize filling from the abundant side when at extreme offsets

    if (isAtStartEdge && offsetsAbove.length >= slotsToFill) {
      // User is at start (few/no timezones below), populate more from above
      const slotsFromBelow = offsetsBelow.length;
      const slotsFromAbove = slotsToFill - slotsFromBelow;

      // Add all available below timezones
      for (const offset of offsetsBelow) {
        const timezone = timezonesByOffset.get(offset);
        if (timezone) {
          targetTimezones.push(timezone);
          selectedOffsets.add(offset);
        }
      }

      // Add random selection from above to fill remaining slots
      const shuffledAbove = [...offsetsAbove];
      for (let i = shuffledAbove.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffledAbove[i];
        const jValue = shuffledAbove[j];
        if (temp !== undefined && jValue !== undefined) {
          shuffledAbove[i] = jValue;
          shuffledAbove[j] = temp;
        }
      }

      for (let i = 0; i < slotsFromAbove && i < shuffledAbove.length; i++) {
        const offset = shuffledAbove[i];
        if (offset !== undefined) {
          const timezone = timezonesByOffset.get(offset);
          if (timezone) {
            targetTimezones.push(timezone);
            selectedOffsets.add(offset);
          }
        }
      }
    } else if (isAtEndEdge && offsetsBelow.length >= slotsToFill) {
      // User is at end (few/no timezones above), populate more from below
      const slotsFromAbove = offsetsAbove.length;
      const slotsFromBelow = slotsToFill - slotsFromAbove;

      // Add all available above timezones
      for (const offset of offsetsAbove) {
        const timezone = timezonesByOffset.get(offset);
        if (timezone) {
          targetTimezones.push(timezone);
          selectedOffsets.add(offset);
        }
      }

      // Add random selection from below to fill remaining slots
      const shuffledBelow = [...offsetsBelow];
      for (let i = shuffledBelow.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffledBelow[i];
        const jValue = shuffledBelow[j];
        if (temp !== undefined && jValue !== undefined) {
          shuffledBelow[i] = jValue;
          shuffledBelow[j] = temp;
        }
      }

      for (let i = 0; i < slotsFromBelow && i < shuffledBelow.length; i++) {
        const offset = shuffledBelow[i];
        if (offset !== undefined) {
          const timezone = timezonesByOffset.get(offset);
          if (timezone) {
            targetTimezones.push(timezone);
            selectedOffsets.add(offset);
          }
        }
      }
    } else {
      // Limited timezones on both sides or not enough on abundant side - use all available
      const allAvailableOffsets = [...offsetsBelow, ...offsetsAbove];
      for (let i = allAvailableOffsets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = allAvailableOffsets[i];
        const jValue = allAvailableOffsets[j];
        if (temp !== undefined && jValue !== undefined) {
          allAvailableOffsets[i] = jValue;
          allAvailableOffsets[j] = temp;
        }
      }

      for (const offset of allAvailableOffsets) {
        if (targetTimezones.length >= oddNumRows) break;
        if (offset !== undefined) {
          const timezone = timezonesByOffset.get(offset);
          if (timezone) {
            targetTimezones.push(timezone);
            selectedOffsets.add(offset);
          }
        }
      }
    }
  } else {
    // Normal case: balanced selection from both sides to center user timezone

    // Calculate how many timezones we need from each side
    const remainingSlotsToFill = oddNumRows - 1; // Already have user timezone
    const slotsFromEachSide = Math.floor(remainingSlotsToFill / 2);
    const extraSlot = remainingSlotsToFill % 2; // If odd number of remaining slots

    // Select timezones from below user's timezone
    const shuffledBelow = [...offsetsBelow];
    for (let i = shuffledBelow.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffledBelow[i];
      const jValue = shuffledBelow[j];
      if (temp !== undefined && jValue !== undefined) {
        shuffledBelow[i] = jValue;
        shuffledBelow[j] = temp;
      }
    }

    let belowCount = 0;
    for (const offset of shuffledBelow) {
      if (belowCount >= slotsFromEachSide) break;
      const timezone = timezonesByOffset.get(offset);
      if (timezone) {
        targetTimezones.push(timezone);
        selectedOffsets.add(offset);
        belowCount++;
      }
    }

    // Select timezones from above user's timezone
    const shuffledAbove = [...offsetsAbove];
    for (let i = shuffledAbove.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffledAbove[i];
      const jValue = shuffledAbove[j];
      if (temp !== undefined && jValue !== undefined) {
        shuffledAbove[i] = jValue;
        shuffledAbove[j] = temp;
      }
    }

    let aboveCount = 0;
    const maxAbove = slotsFromEachSide + extraSlot; // Give extra slot to above if needed
    for (const offset of shuffledAbove) {
      if (aboveCount >= maxAbove) break;
      const timezone = timezonesByOffset.get(offset);
      if (timezone) {
        targetTimezones.push(timezone);
        selectedOffsets.add(offset);
        aboveCount++;
      }
    }
  }

  // If we still don't have enough timezones, fill in gaps with closest available timezones
  if (targetTimezones.length < oddNumRows) {
    const usedOffsets = new Set(targetTimezones.map(tz => tz.offset));
    const availableTimezones = allTimezones.filter(tz => !usedOffsets.has(tz.offset));

    // Sort by distance from user's timezone
    availableTimezones.sort((a, b) => {
      const distanceA = Math.abs(a.offset - userOffset);
      const distanceB = Math.abs(b.offset - userOffset);
      return distanceA - distanceB;
    });

    // Add the closest ones until we have enough
    for (const timezone of availableTimezones) {
      if (targetTimezones.length >= oddNumRows) break;
      targetTimezones.push(timezone);
    }
  }

  // Sort by offset to maintain the proper order
  targetTimezones.sort((a, b) => a.offset - b.offset);

  return targetTimezones.slice(0, oddNumRows);
}

/**
 * Extract and format city name from IANA timezone identifier
 * @param iana IANA timezone identifier (e.g., "America/New_York")
 * @returns Formatted city name (e.g., "New York")
 */
function extractCityName(iana: string, timezone?: TimeZone): string {
  // Handle custom timezones: if timezone object is provided and has cityName, use it
  if (timezone?.isCustom && timezone.cityName) {
    return timezone.cityName;
  }

  // Handle custom timezone IANA identifiers even without timezone object
  if (iana.startsWith('custom-')) {
    // For custom timezones without timezone object, extract offset and create basic name
    const offset = iana.replace('custom-', '');
    return `Custom UTC${parseFloat(offset) >= 0 ? '+' : ''}${offset}`;
  }

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
 * @param date Date to calculate timezone abbreviation for (defaults to current date)
 * @returns Timezone abbreviation (e.g., "EDT")
 */
function getTimezoneAbbreviation(displayName: string, iana: string, date?: Date): string {
  try {
    // Use browser's Intl.DateTimeFormat to get timezone abbreviation in user's native language
    const formatter = new Intl.DateTimeFormat(undefined, {
      timeZone: iana,
      timeZoneName: 'short',
    });

    // Format the provided date (or current date) and extract the timezone abbreviation
    const parts = formatter.formatToParts(date || new Date());
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
 * @param date Date to calculate timezone name for (defaults to current date)
 * @returns Browser-localized timezone name
 */
function createTimezoneDisplayName(iana: string, offset: number, date?: Date): string {
  try {
    // Use browser's native timezone display names in user's language
    const formatter = new Intl.DateTimeFormat(undefined, {
      timeZone: iana,
      timeZoneName: 'long',
    });

    // Get the timezone name from the provided date (or current date)
    const parts = formatter.formatToParts(date || new Date());
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
 * @param baseDate Date to center the timeline on (defaults to current date)
 * @returns Array of timeline hours with daylight information and date transitions
 */
export function generateTimelineHours(numHours: number, timezone: TimeZone, baseDate?: Date): TimelineHour[] {
  const now = baseDate || new Date();
  const userTz = getUserTimezone();

  // Get current hour in user's timezone and round down
  const currentUserHour = new Date(now.toLocaleString('en-US', { timeZone: userTz.iana }));
  currentUserHour.setMinutes(0, 0, 0);

  const hours: TimelineHour[] = [];

  // Calculate hours from -24 to +24 relative to current hour (48 hours total)
  // This gives us 24 hours before and 24 hours after the current time
  const startOffset = -24;

  // Calculate sunrise/sunset times for the date range we'll display
  const sunriseSunsetCache = new Map<string, { sunrise: Date; sunset: Date } | null>();

  for (let i = 0; i < numHours; i++) {
    // Calculate the time in the target timezone
    const hourOffset = startOffset + i;
    const baseTime = new Date(currentUserHour.getTime() + hourOffset * 60 * 60 * 1000);
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

    // Check if this hour represents a date transition (midnight = start of new day)
    const isDateTransition = timeInTz.getHours() === 0;

    // Generate date string for display if this is a date transition
    let dateString: string | undefined;
    if (isDateTransition) {
      // Format date using user's locale (e.g., "Aug 6", "6 Aug", etc. depending on locale)
      dateString = timeInTz.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    }

    // Get sunrise/sunset times for this date (cache by date string)
    const dateKey = timeInTz.toDateString();
    if (!sunriseSunsetCache.has(dateKey)) {
      sunriseSunsetCache.set(dateKey, getSunriseSunsetTimes(timezone, timeInTz));
    }
    const sunTimes = sunriseSunsetCache.get(dateKey);

    let isSunriseHour = false;
    let isSunsetHour = false;
    let sunriseTime: string | undefined;
    let sunsetTime: string | undefined;

    if (sunTimes) {
      // Format sunrise/sunset times for display
      sunriseTime = formatTimeInTimezone(sunTimes.sunrise, timezone.iana);
      sunsetTime = formatTimeInTimezone(sunTimes.sunset, timezone.iana);

      // Check if this is the sunrise hour (transition from night to day)
      // We check if this hour is daylight and the previous hour would be night
      if (isDaylight) {
        const prevHourTime = new Date(timeInTz.getTime() - 60 * 60 * 1000);
        const prevHourDaylight = isHourInDaylight(timezone, prevHourTime);
        if (!prevHourDaylight) {
          isSunriseHour = true;
        }
      }

      // Check if this is the sunset hour (transition from day to night)
      // We check if this hour is night and the previous hour was daylight
      if (!isDaylight) {
        const prevHourTime = new Date(timeInTz.getTime() - 60 * 60 * 1000);
        const prevHourDaylight = isHourInDaylight(timezone, prevHourTime);
        if (prevHourDaylight) {
          isSunsetHour = true;
        }
      }
    }

    hours.push({
      hour: timeInTz.getHours(),
      date: timeInTz,
      time12: hour12,
      time24: hour24,
      isDaylight,
      isDateTransition,
      dateString,
      isSunriseHour,
      isSunsetHour,
      sunriseTime,
      sunsetTime,
    });
  }

  return hours;
}

/**
 * Get the current cell width based on screen size
 * Matches the CSS media query breakpoints for .timeline-cell exactly
 * @returns Cell width in pixels
 */
function getCellWidth(): number {
  const screenWidth = window.innerWidth;

  // Match CSS media query breakpoints for .timeline-cell min-width exactly
  if (screenWidth >= 1400) {
    return 120; // Extra large devices - @media (min-width: 1400px)
  } else if (screenWidth >= 992) {
    return 100; // Large devices - @media (min-width: 992px)
  } else if (screenWidth >= 768) {
    return 90; // Medium devices - @media (min-width: 768px)
  } else {
    return 60; // Default and small devices - matches base CSS and @media (max-width: 576px)
  }
}

/**
 * Calculate the visual offset for timezones with fractional hour offsets
 * This allows timezones like +4:30, -9:30, +12:45 to be visually positioned
 * between even-hour timezones to show their true time relationships
 * @param timezone The timezone to calculate offset for
 * @returns Offset in pixels to apply as margin-left
 */
function calculateFractionalOffset(timezone: TimeZone): number {
  // Extract the fractional part of the UTC offset
  const fractionalHours = Math.abs(timezone.offset % 1);

  // If there's no fractional part, no offset needed
  if (fractionalHours === 0) {
    return 0;
  }

  // Convert fractional hours to pixels
  // 0.25 = 15 minutes, 0.5 = 30 minutes, 0.75 = 45 minutes
  const cellWidth = getCellWidth();
  return fractionalHours * cellWidth;
}

/**
 * Calculate scroll position to place current hour immediately to the right of timezone labels
 * @returns Scroll position in pixels
 */
function getCurrentHourScrollPosition(): number {
  const cellWidth = getCellWidth();

  // The current hour should always be at index 24 in a properly structured 48-hour timeline
  // (24 hours before current + current hour = index 24)
  const currentHourIndex = 24;

  // Position current hour as the first visible hour after the sticky timezone label
  // This places the current hour immediately to the right of the timezone labels
  const scrollPosition = currentHourIndex * cellWidth;

  // Ensure we don't scroll to negative position
  return Math.max(0, scrollPosition);
}

/**
 * Create timeline data for rendering
 * @param numHours - Number of hours to display
 * @param numRows - Number of timezone rows to display
 * @param baseDate - Date to center the timeline on (defaults to current date)
 * @returns Array of timeline rows
 */
export function createTimelineData(numHours: number, numRows: number, baseDate?: Date): TimelineRow[] {
  const userTz = getUserTimezone(baseDate);
  const timezones = getTimezonesForTimeline(numRows, baseDate);

  return timezones.map(timezone => ({
    timezone,
    hours: generateTimelineHours(numHours, timezone, baseDate),
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

  // Always show 48 hours total: 24 hours before and 24 hours after current time
  // This allows users to see a full day in both directions from the current moment
  const numHours = 48;

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
 * @param baseDate Optional date to center the timeline on (defaults to current date)
 */
export function renderTimeline(baseDate?: Date): void {
  const container = document.getElementById('timeline-container');
  if (!container) {
    console.error('Timeline container not found');
    return;
  }

  const { numHours, numRows } = getTimelineDimensions();

  // Get current time format setting
  const settings = SettingsPanel.getCurrentSettings();
  const timeFormat = settings?.timeFormat || '12h';

  const timelineData = createTimelineData(numHours, numRows, baseDate);

  // Clear container
  container.innerHTML = '';

  // Create timeline rows
  timelineData.forEach(row => {
    const rowElement = document.createElement('div');
    rowElement.className = 'timeline-row';

    if (row.isUserTimezone) {
      rowElement.classList.add('user-timezone');
    }

    // Apply fractional offset for timezones with non-even hour offsets
    const fractionalOffset = calculateFractionalOffset(row.timezone);
    if (fractionalOffset > 0) {
      rowElement.style.marginLeft = `${fractionalOffset}px`;
    }

    // Timezone label
    const labelCell = document.createElement('div');
    labelCell.className = 'timeline-cell timeline-timezone-label';
    labelCell.innerHTML = `
      <div class="timezone-info">
        <div class="timezone-name">${extractCityName(row.timezone.iana, row.timezone)}</div>
        <div class="timezone-offset">${row.timezone.displayName} (${formatOffset(row.timezone.offset)})</div>
      </div>
    `;
    rowElement.appendChild(labelCell);

    // Hour cells
    row.hours.forEach((hour, index) => {
      const hourCell = document.createElement('div');
      hourCell.className = 'timeline-cell timeline-hour';

      // Add date transition class and display date if this is midnight
      if (hour.isDateTransition && hour.dateString) {
        hourCell.classList.add('date-transition');
        // Create a container for both date and time
        hourCell.innerHTML = `
          <div class="date-display">${hour.dateString}</div>
          <div class="time-display">${timeFormat === '12h' ? hour.time12 : hour.time24}</div>
        `;
      } else {
        // Use consistent format based on setting for regular hours
        hourCell.textContent = timeFormat === '12h' ? hour.time12 : hour.time24;
      }

      // Mark current hour (index 24 since we start from -24 hours)
      if (index === 24) {
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

      // Add sunrise/sunset transition indicators with tooltips
      if (hour.isSunriseHour && hour.sunriseTime) {
        hourCell.classList.add('sunrise-hour');
        hourCell.title = `Sunrise: ${hour.sunriseTime}`;
        hourCell.setAttribute('data-sunrise-time', hour.sunriseTime);
      }

      if (hour.isSunsetHour && hour.sunsetTime) {
        hourCell.classList.add('sunset-hour');
        hourCell.title = `Sunset: ${hour.sunsetTime}`;
        hourCell.setAttribute('data-sunset-time', hour.sunsetTime);
      }

      rowElement.appendChild(hourCell);
    });

    container.appendChild(rowElement);
  });

  // Apply dynamic width calculation after all rows are rendered
  adjustTimezoneLabelWidths();

  // Scroll to position current hour at the leftmost visible position
  // Since the calculation is now correct, apply it directly and in next frame
  const scrollToCurrentHour = (): void => {
    const currentHourScrollPosition = getCurrentHourScrollPosition();
    container.scrollLeft = currentHourScrollPosition;
  };

  // Apply scroll position immediately and ensure it persists
  scrollToCurrentHour();
  // Also apply after next frame to handle any layout shifts
  window.requestAnimationFrame(scrollToCurrentHour);
}

/**
 * Timeline Manager - Orchestrates timezone timeline visualization
 */
export class TimelineManager {
  private container: HTMLElement;
  private modal: TimezoneModal;
  private dateTimeModal: DateTimeModal;
  private selectedTimezones: TimeZone[] = [];
  private selectedDate: Date = new Date(); // Default to today

  constructor() {
    this.container = document.getElementById('timeline-container') as HTMLElement;
    if (!this.container) {
      throw new Error('Timeline container not found');
    }

    // Initialize modal with callback and selected date
    this.modal = new TimezoneModal(
      (timezone: TimeZone, isOffCycle?: boolean) => this.addTimezone(timezone, isOffCycle),
      this.selectedDate,
    );

    // Initialize datetime modal with callback
    this.dateTimeModal = new DateTimeModal((dateTime: Date) => this.setSelectedDate(dateTime));

    // Initialize with user's timezone and a few others
    this.initializeDefaultTimezones();

    // Listen for settings changes to refresh timeline
    window.addEventListener('settingsChanged', () => {
      this.renderTimeline();
    });
  }

  private initializeDefaultTimezones(): void {
    // Get screen-appropriate number of timezone rows
    const { numRows } = getTimelineDimensions();

    // Get properly centered timezones with user timezone in the middle using selected date
    this.selectedTimezones = getTimezonesForTimeline(numRows, this.selectedDate);

    // Also load any saved custom timezones that were previously added to timeline
    const customTimezones = CustomTimezoneManager.getCustomTimezones();
    for (const customTz of customTimezones) {
      // Only add if not already included
      const exists = this.selectedTimezones.find(tz => tz.iana === customTz.iana);
      if (!exists) {
        this.selectedTimezones.push(customTz);
      }
    }

    this.renderTimeline();
  }

  public addTimezone(timezone: TimeZone, isOffCycle?: boolean): void {
    // Check if timezone already exists
    const exists = this.selectedTimezones.find(tz => tz.iana === timezone.iana);
    if (!exists) {
      // Create a copy of the timezone and set the off-cycle flag if specified
      const timezoneToAdd: TimeZone = {
        ...timezone,
        ...(isOffCycle !== undefined && { isOffCycle }),
      };
      this.selectedTimezones.push(timezoneToAdd);
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

  public setSelectedDate(date: Date): void {
    this.selectedDate = new Date(date);

    // Handle DST transitions while preserving off-cycle timezones
    const updatedTimezones: TimeZone[] = [];

    for (const timezone of this.selectedTimezones) {
      if (timezone.isOffCycle || timezone.isCustom) {
        // Preserve off-cycle and custom timezones without DST adjustment
        updatedTimezones.push(timezone);
      } else {
        // For regular timezones, recalculate for new date to handle DST transitions
        const allTimezones = getAllTimezonesOrdered(this.selectedDate);
        const updatedTimezone = allTimezones.find(tz => tz.iana === timezone.iana);
        if (updatedTimezone) {
          updatedTimezones.push(updatedTimezone);
        } else {
          // Fallback: keep original if not found in updated list
          updatedTimezones.push(timezone);
        }
      }
    }

    this.selectedTimezones = updatedTimezones;

    // Re-add any saved custom timezones that might not be in the current selection
    const customTimezones = CustomTimezoneManager.getCustomTimezones();
    for (const customTz of customTimezones) {
      // Only add if not already included
      const exists = this.selectedTimezones.find(tz => tz.iana === customTz.iana);
      if (!exists) {
        this.selectedTimezones.push(customTz);
      }
    }

    // Update the modal with the new date and recalculated timezones
    this.modal = new TimezoneModal(
      (timezone: TimeZone, isOffCycle?: boolean) => this.addTimezone(timezone, isOffCycle),
      this.selectedDate,
    );

    this.renderTimeline();
  }

  public getSelectedDate(): Date {
    return new Date(this.selectedDate);
  }

  public openDatePicker(): void {
    this.dateTimeModal.setDateTime(this.selectedDate);
    this.dateTimeModal.open();
  }

  private renderTimeline(): void {
    const { numHours } = getTimelineDimensions();

    // Get current time format setting
    const settings = SettingsPanel.getCurrentSettings();
    const timeFormat = settings?.timeFormat || '12h';

    // Clear container
    this.container.innerHTML = '';

    // Create timeline controls (date picker and add timezone button)
    const timelineSection = this.container.closest('.timeline-section');
    if (timelineSection) {
      // Remove existing controls if present
      const existingControls = timelineSection.querySelector('.timeline-controls');
      if (existingControls) {
        existingControls.remove();
      }

      // Create date selection button
      const dateButton = document.createElement('button');
      dateButton.className = 'button secondary date-picker-btn';
      const dateStr = this.selectedDate.toLocaleDateString();
      dateButton.textContent = `📅 ${dateStr}`;
      dateButton.title = 'Select date to view timeline for';
      dateButton.addEventListener('click', () => this.openDatePicker());

      // Create add timezone button
      const addButton = document.createElement('button');
      addButton.className = 'button add-timezone-btn';
      addButton.textContent = '+ Add Timezone';
      addButton.addEventListener('click', () => this.openTimezoneModal());

      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'timeline-controls';
      buttonContainer.appendChild(dateButton);
      buttonContainer.appendChild(addButton);

      // Insert the button container before the timeline container
      timelineSection.insertBefore(buttonContainer, this.container);
    }

    // Create timeline rows for selected timezones
    // For initial load, preserve the centered order from getTimezonesForTimeline
    // For manually added timezones, sort by offset for logical progression
    const userTz = getUserTimezone(this.selectedDate);
    const userIndex = this.selectedTimezones.findIndex(tz => tz.iana === userTz.iana);

    let timezonesToRender: TimeZone[];
    if (userIndex !== -1) {
      // User timezone exists - preserve order to maintain centering
      timezonesToRender = this.selectedTimezones;
    } else {
      // Fallback to sorting by offset if user timezone not found
      timezonesToRender = [...this.selectedTimezones].sort((a, b) => a.offset - b.offset);
    }

    timezonesToRender.forEach(timezone => {
      const rowElement = document.createElement('div');
      rowElement.className = 'timeline-row';

      const userTz = getUserTimezone(this.selectedDate);
      if (timezone.iana === userTz.iana) {
        rowElement.classList.add('user-timezone');
      }

      // Apply fractional offset for timezones with non-even hour offsets
      const fractionalOffset = calculateFractionalOffset(timezone);
      if (fractionalOffset > 0) {
        rowElement.style.marginLeft = `${fractionalOffset}px`;
      }

      // Timezone label with remove button
      const labelCell = document.createElement('div');
      labelCell.className = 'timeline-cell timeline-timezone-label';
      labelCell.innerHTML = `
        <div class="timezone-info">
          <div class="timezone-name">${extractCityName(timezone.iana, timezone)}</div>
          <div class="timezone-offset">${timezone.displayName} (${formatOffset(timezone.offset)})</div>
        </div>
        <button class="remove-timezone-btn" title="Remove timezone">×</button>
      `;

      // Add remove button functionality
      const removeButton = labelCell.querySelector('.remove-timezone-btn') as HTMLElement;
      removeButton.addEventListener('click', () => this.removeTimezone(timezone));

      rowElement.appendChild(labelCell);

      // Hour cells
      const timezoneHours = generateTimelineHours(numHours, timezone, this.selectedDate);
      timezoneHours.forEach((hour, index) => {
        const hourCell = document.createElement('div');
        hourCell.className = 'timeline-cell timeline-hour';

        // Add sunrise/sunset transition indicators with tooltips
        if (hour.isSunriseHour && hour.sunriseTime) {
          hourCell.classList.add('sunrise-hour', 'daylight-hour');
          hourCell.title = `🔆 Sunrise: ${hour.sunriseTime}`;
          hourCell.setAttribute('data-sunrise-time', hour.sunriseTime);
          // Replace content with sunrise icon and time
          if (hour.isDateTransition && hour.dateString) {
            hourCell.innerHTML = `
              <div class="date-display">${hour.dateString}</div>
              <div class="time-display">🔆 ${timeFormat === '12h' ? hour.time12 : hour.time24}</div>
            `;
          } else {
            hourCell.innerHTML = `🔆 ${timeFormat === '12h' ? hour.time12 : hour.time24}`;
          }
        } else if (hour.isSunsetHour && hour.sunsetTime) {
          hourCell.classList.add('sunset-hour', 'night-hour');
          hourCell.title = `🔅 Sunset: ${hour.sunsetTime}`;
          hourCell.setAttribute('data-sunset-time', hour.sunsetTime);
          // Replace content with sunset icon and time
          if (hour.isDateTransition && hour.dateString) {
            hourCell.innerHTML = `
              <div class="date-display">${hour.dateString}</div>
              <div class="time-display">🔅 ${timeFormat === '12h' ? hour.time12 : hour.time24}</div>
            `;
          } else {
            hourCell.innerHTML = `🔅 ${timeFormat === '12h' ? hour.time12 : hour.time24}`;
          }
        } else {
          // Regular hour content (no sunrise/sunset transition)
          if (hour.isDateTransition && hour.dateString) {
            hourCell.classList.add('date-transition');
            // Create a container for both date and time
            hourCell.innerHTML = `
              <div class="date-display">${hour.dateString}</div>
              <div class="time-display">${timeFormat === '12h' ? hour.time12 : hour.time24}</div>
            `;
          } else {
            // Use consistent format based on setting for regular hours
            hourCell.textContent = timeFormat === '12h' ? hour.time12 : hour.time24;
          }
        }

        // Mark current hour (index 24 since we start from -24 hours)
        if (index === 24) {
          hourCell.classList.add('current-hour');
        }

        // Add working hours class (9 AM to 5 PM)
        if (hour.hour >= 9 && hour.hour < 17) {
          hourCell.classList.add('working-hours');
        }

        // Add daylight/night indicator (only if not already handled by sunrise/sunset)
        if (hour.isDaylight !== undefined && !hour.isSunriseHour && !hour.isSunsetHour) {
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

      this.container.appendChild(rowElement);
    });

    // Apply dynamic width calculation after all rows are rendered
    adjustTimezoneLabelWidths();

    // Scroll to position current hour at the leftmost visible position
    // Since the calculation is now correct, apply it directly and in next frame
    const scrollToCurrentHour = (): void => {
      const currentHourScrollPosition = getCurrentHourScrollPosition();
      this.container.scrollLeft = currentHourScrollPosition;
    };

    // Apply scroll position immediately and ensure it persists
    scrollToCurrentHour();
    // Also apply after next frame to handle any layout shifts
    window.requestAnimationFrame(scrollToCurrentHour);
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

// Cache for processed timezone data to avoid expensive recalculations
interface ProcessedTimezoneData {
  juneTimeZones: TimeZone[];
  decemberTimeZones: TimeZone[];
  userTimezone: string;
  currentYear: number;
}

// Cache for timezone data by year to avoid expensive recalculations
const processedTimezoneCache = new Map<number, ProcessedTimezoneData>();

// Cache key for localStorage
const TIMEZONE_CACHE_KEY = 'everytimezone_processed_timezones';

/**
 * Type guard to check if an object is a valid ProcessedTimezoneData
 */
function isProcessedTimezoneData(obj: unknown): obj is ProcessedTimezoneData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray((obj as ProcessedTimezoneData).juneTimeZones) &&
    Array.isArray((obj as ProcessedTimezoneData).decemberTimeZones) &&
    typeof (obj as ProcessedTimezoneData).userTimezone === 'string' &&
    typeof (obj as ProcessedTimezoneData).currentYear === 'number'
  );
}

/**
 * Load timezone cache from localStorage
 */
function loadTimezoneCache(): void {
  try {
    const stored = localStorage.getItem(TIMEZONE_CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate the structure and load into memory cache
      for (const [year, data] of Object.entries(parsed)) {
        const yearNum = parseInt(year, 10);
        if (isProcessedTimezoneData(data)) {
          processedTimezoneCache.set(yearNum, data);
        }
      }
      console.log(`Loaded timezone cache for ${processedTimezoneCache.size} years from localStorage`);
    }
  } catch (error) {
    console.warn('Failed to load timezone cache from localStorage:', error);
    // Clear corrupted cache
    localStorage.removeItem(TIMEZONE_CACHE_KEY);
  }
}

/**
 * Save timezone cache to localStorage
 */
function saveTimezoneCache(): void {
  try {
    const cacheObj: Record<number, ProcessedTimezoneData> = {};
    for (const [year, data] of processedTimezoneCache.entries()) {
      cacheObj[year] = data;
    }
    localStorage.setItem(TIMEZONE_CACHE_KEY, JSON.stringify(cacheObj));
    console.log(`Saved timezone cache for ${processedTimezoneCache.size} years to localStorage`);
  } catch (error) {
    console.warn('Failed to save timezone cache to localStorage:', error);
  }
}

/**
 * Initialize timezone data by processing all browser timezones for June and December
 * This expensive operation should only be done once on page load
 */
function initializeTimezoneData(year: number = new Date().getFullYear()): ProcessedTimezoneData {
  const userTimezone = Temporal.Now.timeZoneId();

  // Get all supported timezones (comprehensive list)
  const allTimezones = Intl.supportedValuesOf('timeZone');

  // Create dates for June 1st and December 31st to capture DST variations
  const juneDate = new Date(year, 5, 1); // June 1st
  const decemberDate = new Date(year, 11, 31); // December 31st

  console.log(`Processing ${allTimezones.length} timezones for June and December variants...`);

  // Process timezones for June (typically DST active in Northern Hemisphere)
  const juneTimeZones = processTimezonesForDate(allTimezones, juneDate, userTimezone);

  // Process timezones for December (typically Standard time in Northern Hemisphere)
  const decemberTimeZones = processTimezonesForDate(allTimezones, decemberDate, userTimezone);

  console.log('Timezone processing complete');

  return {
    juneTimeZones,
    decemberTimeZones,
    userTimezone,
    currentYear: year,
  };
}

/**
 * Process all timezones for a specific date to get their offsets and display names
 */
function processTimezonesForDate(timezoneIanas: readonly string[], date: Date, userTimezone: string): TimeZone[] {
  // Create timezone objects with offsets for the specific date
  const timezoneData = timezoneIanas.map(iana => {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: iana,
      timeZoneName: 'longOffset',
    });

    const offsetStr = formatter.formatToParts(date).find(part => part.type === 'timeZoneName')?.value || '+00:00';

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
    const displayName = displayFormatter.formatToParts(date).find(part => part.type === 'timeZoneName')?.value || iana;

    return {
      name: createTimezoneDisplayName(iana, offset, date),
      offset,
      displayName,
      iana,
      cityName: extractCityName(iana),
      abbreviation: getTimezoneAbbreviation(displayName, iana, date),
    };
  });

  // Get user's timezone offset for this date
  const userTimezoneData = timezoneData.find(tz => tz.iana === userTimezone);
  const userOffset = userTimezoneData?.offset || 0;

  // Sort timezones: start with user's timezone, then go around the world
  return timezoneData.sort((a, b) => {
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
}

/**
 * Determine which timezone set to use based on the actual DST status for a given date.
 * This checks the user's timezone offset for the given date and compares it to the
 * June and December timezone data to determine which set matches.
 */
function getTimezoneSetForDate(date: Date, processedData: ProcessedTimezoneData): TimeZone[] {
  const userTimezone = processedData.userTimezone;

  // Get the actual offset for the user's timezone on the given date
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: userTimezone,
    timeZoneName: 'longOffset',
  });

  const offsetStr = formatter.formatToParts(date).find(part => part.type === 'timeZoneName')?.value || '+00:00';

  // Parse offset string like "GMT+05:30" or "GMT-08:00"
  const offsetMatch = offsetStr.match(/GMT([+-])(\d{2}):(\d{2})/);
  let currentOffset = 0;
  if (offsetMatch && offsetMatch[2] && offsetMatch[3]) {
    const sign = offsetMatch[1] === '+' ? 1 : -1;
    const hours = parseInt(offsetMatch[2], 10);
    const minutes = parseInt(offsetMatch[3], 10);
    currentOffset = sign * (hours + minutes / 60);
  }

  // Find the user's timezone in both June and December sets
  const juneUserTz = processedData.juneTimeZones.find(tz => tz.iana === userTimezone);
  const decemberUserTz = processedData.decemberTimeZones.find(tz => tz.iana === userTimezone);

  // Compare the current offset to determine which set to use
  if (juneUserTz && Math.abs(currentOffset - juneUserTz.offset) < 0.1) {
    return processedData.juneTimeZones;
  } else if (decemberUserTz && Math.abs(currentOffset - decemberUserTz.offset) < 0.1) {
    return processedData.decemberTimeZones;
  }

  // Fallback: if we can't determine, use June set as default
  return processedData.juneTimeZones;
}

/**
 * Get all supported timezones that the browser knows about,
 * ordered starting with the user's current timezone and going around the world
 * @param date Optional date to calculate timezone offsets for (defaults to current date)
 * @returns Array of timezone objects ordered from user's timezone around the globe
 */
export function getAllTimezonesOrdered(date?: Date): TimeZone[] {
  const now = date || new Date();
  const currentYear = now.getFullYear();

  // Load cache from localStorage on first call
  if (processedTimezoneCache.size === 0) {
    loadTimezoneCache();
  }

  // Check if we have cached data for this year
  if (!processedTimezoneCache.has(currentYear)) {
    console.log('Initializing timezone data for year', currentYear);
    const processedData = initializeTimezoneData(currentYear);
    processedTimezoneCache.set(currentYear, processedData);

    // Save to localStorage after adding new year
    saveTimezoneCache();
  }

  // Get cached data for this year
  const processedData = processedTimezoneCache.get(currentYear);
  if (!processedData) {
    throw new Error(`Failed to get timezone data for year ${currentYear}`);
  }

  // Return appropriate timezone set based on actual DST status for the date
  return getTimezoneSetForDate(now, processedData);
}

/**
 * Get timezone variations for a given IANA identifier using fixed dates
 * Returns both summer (June 1st) and winter (December 31st) variations
 */
function getTimezoneVariations(iana: string, year: number = new Date().getFullYear()): TimeZone[] {
  const variations: TimeZone[] = [];

  // Use June 1st for summer time and December 31st for winter time
  const summerDate = new Date(year, 5, 1); // June 1st
  const winterDate = new Date(year, 11, 31); // December 31st

  for (const date of [summerDate, winterDate]) {
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: iana,
      timeZoneName: 'longOffset',
    });

    const offsetStr = formatter.formatToParts(date).find(part => part.type === 'timeZoneName')?.value || '+00:00';

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
    const displayName = displayFormatter.formatToParts(date).find(part => part.type === 'timeZoneName')?.value || iana;

    const timezone: TimeZone = {
      name: createTimezoneDisplayName(iana, offset, date),
      offset,
      displayName,
      iana,
      cityName: extractCityName(iana),
      abbreviation: getTimezoneAbbreviation(displayName, iana, date),
    };

    // Only add if we don't already have this variation (same offset)
    const exists = variations.find(v => v.offset === timezone.offset);
    if (!exists) {
      variations.push(timezone);
    }
  }

  return variations;
}

/**
 * Extract base location from IANA timezone identifier for grouping
 * Example: "America/Los_Angeles" -> "Los Angeles"
 */
function extractBaseLocation(iana: string): string {
  const parts = iana.split('/');
  if (parts.length >= 2) {
    // Handle cases like "America/New_York" or "Europe/London"
    const lastPart = parts[parts.length - 1];
    return lastPart ? lastPart.replace(/_/g, ' ') : iana;
  }
  return iana;
}

/**
 * Extract country/region from IANA timezone identifier
 * Example: "America/Los_Angeles" -> "America"
 */
function extractRegion(iana: string): string {
  const parts = iana.split('/');
  return parts[0] || '';
}

/**
 * Get grouped timezones with DST/Standard variations, prioritized by selected date
 */
export function getGroupedTimezones(selectedDate?: Date): GroupedTimezone[] {
  const date = selectedDate || new Date();
  const allTimezones = Intl.supportedValuesOf('timeZone');
  const locationGroups = new Map<string, GroupedTimezone>();

  // Group timezones by location
  for (const iana of allTimezones) {
    const baseLocation = extractBaseLocation(iana);
    const region = extractRegion(iana);
    const variations = getTimezoneVariations(iana);

    if (variations.length === 0) continue;

    // Find the current timezone for the selected date
    const currentTimezone = getAllTimezonesOrdered(date).find(tz => tz.iana === iana);
    if (!currentTimezone) continue;

    // Find alternate timezone (different offset)
    const alternateTimezone = variations.find(v => v.offset !== currentTimezone.offset);

    const groupKey = `${region}/${baseLocation}`;

    if (!locationGroups.has(groupKey)) {
      const group: GroupedTimezone = {
        location: baseLocation,
        country: region,
        current: currentTimezone,
        variations: variations,
      };
      if (alternateTimezone) {
        group.alternate = alternateTimezone;
      }
      locationGroups.set(groupKey, group);
    } else {
      // If we already have this location, check if this timezone is more representative
      const existing = locationGroups.get(groupKey);
      if (!existing) continue;

      // Prefer main city names over specific districts/areas
      const currentCityParts = currentTimezone.cityName.split(/[/\-_]/);
      const existingCityParts = existing.current.cityName.split(/[/\-_]/);

      if (currentCityParts.length < existingCityParts.length) {
        // This timezone has a simpler name, prefer it
        existing.current = currentTimezone;
        if (alternateTimezone) {
          existing.alternate = alternateTimezone;
        }
        existing.variations = [...existing.variations, ...variations].filter(
          (v, i, arr) => arr.findIndex(v2 => v2.offset === v.offset) === i,
        );
      }
    }
  }

  // Convert to array and sort
  const grouped = Array.from(locationGroups.values());

  // Get user's timezone for sorting
  const userTimezone = Temporal.Now.timeZoneId();
  const userTimezoneData = getAllTimezonesOrdered(date).find(tz => tz.iana === userTimezone);
  const userOffset = userTimezoneData?.offset || 0;

  // Sort by proximity to user's timezone, then by location name
  return grouped.sort((a, b) => {
    const getDistance = (offset: number): number => {
      let distance = offset - userOffset;
      if (distance < -12) distance += 24;
      if (distance > 12) distance -= 24;
      return Math.abs(distance);
    };

    const distanceA = getDistance(a.current.offset);
    const distanceB = getDistance(b.current.offset);

    if (distanceA !== distanceB) {
      return distanceA - distanceB;
    }
    return a.location.localeCompare(b.location);
  });
}

/**
 * Grouped timezone information for a location showing DST and Standard time variants
 */
export interface GroupedTimezone {
  location: string; // Base location name (e.g., "Los Angeles", "New York")
  country?: string; // Country name if available
  current: TimeZone; // Current timezone for the selected date
  alternate?: TimeZone; // Alternate timezone (DST/Standard variant) if different
  variations: TimeZone[]; // All timezone variations for this location
}

/**
 * Cache of valid timezone offsets from existing IANA timezones
 */
let validOffsetsCache: Set<number> | null = null;

/**
 * Get all valid timezone offsets from existing IANA timezones using the existing temporal-based method
 */
function getValidOffsets(): Set<number> {
  if (validOffsetsCache) {
    return validOffsetsCache;
  }

  // Use the existing getAllTimezonesOrdered function which uses temporal methods
  const allTimezones = getAllTimezonesOrdered();
  const offsets = new Set<number>();

  allTimezones.forEach(timezone => {
    offsets.add(timezone.offset);
  });

  validOffsetsCache = offsets;
  return offsets;
}

/**
 * Check if an offset is valid based on existing timezone data or reasonable bounds
 */
function isValidOffset(offset: number): boolean {
  const validOffsets = getValidOffsets();

  // Allow offsets that exist in IANA data
  if (validOffsets.has(offset)) {
    return true;
  }

  // Also allow reasonable custom offsets within expanded bounds
  // Extended to cover potential military time zones and extreme cases
  return offset >= -12 && offset <= 14 && Number.isFinite(offset);
}

/**
 * Parse offset query string and return offset number if valid
 */
function parseOffsetQuery(query: string): number | null {
  const normalizedQuery = query.trim().toLowerCase();

  // Match patterns like "utc-12", "gmt+5", "-12", "+5.5", etc.
  const patterns = [/^(?:utc|gmt)([+-]?\d+(?:\.\d+)?)$/, /^([+-]\d+(?:\.\d+)?)$/, /^([+-]?\d+(?:\.\d+)?)$/];

  for (const pattern of patterns) {
    const match = normalizedQuery.match(pattern);
    if (match && match[1]) {
      const offset = parseFloat(match[1]);
      if (isValidOffset(offset)) {
        return offset;
      }
    }
  }

  return null;
}

/**
 * Custom timezone storage and management
 */
class CustomTimezoneManager {
  private static readonly STORAGE_KEY = 'customTimezones';

  static getCustomTimezones(): TimeZone[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const customData = JSON.parse(stored);
        return customData.map((data: TimeZone) => ({
          ...data,
          isCustom: true,
          iana: `custom-${data.offset}`, // Ensure unique IANA-like identifier
        }));
      }
    } catch (error) {
      console.warn('Failed to load custom timezones from localStorage:', error);
    }
    return [];
  }

  static saveCustomTimezone(timezone: TimeZone): void {
    try {
      const customTimezones = this.getCustomTimezones();
      // Remove any existing custom timezone with the same offset and name
      const filtered = customTimezones.filter(
        tz => !(tz.offset === timezone.offset && tz.cityName === timezone.cityName),
      );
      filtered.push({
        ...timezone,
        isCustom: true,
        iana: `custom-${timezone.offset}`,
      });

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.warn('Failed to save custom timezone to localStorage:', error);
    }
  }

  static removeCustomTimezone(timezone: TimeZone): void {
    try {
      const customTimezones = this.getCustomTimezones();
      const filtered = customTimezones.filter(
        tz => !(tz.offset === timezone.offset && tz.cityName === timezone.cityName),
      );
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.warn('Failed to remove custom timezone from localStorage:', error);
    }
  }
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
  private groupedTimezones: GroupedTimezone[];
  private filteredTimezones: TimeZone[];
  private filteredGroups: GroupedTimezone[];
  private selectedIndex = 0;
  private currentUserTimezone: string;
  private onTimezoneSelectedCallback: ((timezone: TimeZone, isOffCycle?: boolean) => void) | undefined;
  private userSearchQuery = ''; // Store user's search query separately
  private selectedDate: Date; // Date to use for timezone calculations

  constructor(onTimezoneSelected?: (timezone: TimeZone, isOffCycle?: boolean) => void, selectedDate?: Date) {
    this.selectedDate = selectedDate || new Date();
    this.modal = document.getElementById('timezone-modal') as HTMLElement;
    this.overlay = document.getElementById('timezone-modal-overlay') as HTMLElement;
    this.input = document.getElementById('timezone-input') as HTMLInputElement;
    this.wheel = document.getElementById('timezone-wheel') as HTMLElement;
    this.selectButton = document.getElementById('select-timezone') as HTMLElement;
    this.cancelButton = document.getElementById('cancel-timezone') as HTMLElement;
    this.closeButton = this.modal.querySelector('.modal-close') as HTMLElement;
    this.upButton = document.getElementById('wheel-up') as HTMLElement;
    this.downButton = document.getElementById('wheel-down') as HTMLElement;

    // Get user's timezone using Temporal (polyfill ensures availability)
    this.currentUserTimezone = Temporal.Now.timeZoneId();

    // Get both grouped and flat timezone lists
    this.groupedTimezones = getGroupedTimezones(this.selectedDate);

    // Combine standard and custom timezones using the selected date
    const standardTimezones = getAllTimezonesOrdered(this.selectedDate);
    const customTimezones = CustomTimezoneManager.getCustomTimezones();
    this.timezones = [...standardTimezones, ...customTimezones];

    this.filteredTimezones = [...this.timezones];
    this.filteredGroups = [...this.groupedTimezones];
    this.onTimezoneSelectedCallback = onTimezoneSelected;

    this.init();
  }

  private init(): void {
    // Set default timezone to user's current timezone
    const userTimezoneIndex = this.timezones.findIndex(tz => tz.iana === this.currentUserTimezone);
    if (userTimezoneIndex !== -1) {
      this.selectedIndex = userTimezoneIndex;
    }

    // Keep input clear on initial load to show placeholder
    this.input.value = '';
    this.userSearchQuery = '';

    // Event listeners
    this.input.addEventListener('input', () => this.handleInputChange());
    this.selectButton.addEventListener('click', () => this.selectTimezone());
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
    // Store the user's search query
    this.userSearchQuery = this.input.value.toLowerCase().trim();

    if (this.userSearchQuery === '') {
      // No search - show grouped view
      this.filteredTimezones = [...this.timezones];
      this.filteredGroups = [...this.groupedTimezones];
    } else {
      // Search - show flat filtered results
      this.filteredTimezones = this.searchTimezones(this.userSearchQuery);
      this.filteredGroups = []; // Empty groups when searching

      // Check if query is a valid offset pattern with no matches
      const offsetMatch = parseOffsetQuery(this.userSearchQuery);
      if (offsetMatch !== null && this.filteredTimezones.length === 0) {
        // Show custom timezone creation option
        this.showCustomTimezoneOption(offsetMatch);
        return;
      }
    }

    // Reset to first item in filtered results
    this.selectedIndex = 0;
    this.renderWheel();
  }

  /**
   * Advanced search function for timezones with scoring and relevance
   * Supports offset patterns like GMT-7, UTC+5:30, PDT-7
   */
  private searchTimezones(query: string): TimeZone[] {
    const results: Array<{ timezone: TimeZone; score: number }> = [];
    const userTimezone = getUserTimezone();
    const userRegion = this.extractRegion(userTimezone.iana);

    // Check if query is an offset pattern (GMT-7, UTC+5:30, PDT-7, etc.)
    const offsetMatch = this.parseOffsetQuery(query);

    // Also search in grouped timezones for alternate variants
    const allSearchTargets: TimeZone[] = [...this.timezones];

    // Add alternate timezones from grouped timezones to search targets
    for (const group of this.groupedTimezones) {
      if (group.alternate && !allSearchTargets.find(tz => tz.iana === group.alternate?.iana)) {
        allSearchTargets.push(group.alternate);
      }
    }

    for (const timezone of allSearchTargets) {
      let score = 0;

      // Handle offset search
      if (offsetMatch !== null) {
        if (Math.abs(timezone.offset - offsetMatch) < 0.01) {
          // Use small epsilon for floating point comparison
          score += 1000; // Very high priority for exact offset matches
        }
      }

      // Text-based search scoring
      const searchTargets = [
        { text: timezone.cityName.toLowerCase(), weight: 100 },
        { text: timezone.displayName.toLowerCase(), weight: 80 },
        { text: timezone.abbreviation.toLowerCase(), weight: 60 },
        { text: timezone.name.toLowerCase(), weight: 40 },
        { text: timezone.iana.toLowerCase(), weight: 20 },
      ];

      let hasMatch = false;
      for (const target of searchTargets) {
        const matchScore = this.calculateTextMatchScore(query, target.text, target.weight);
        if (matchScore > 0) {
          score += matchScore;
          hasMatch = true;
        }
      }

      // Regional preference bonus
      if (hasMatch || offsetMatch !== null) {
        const timezoneRegion = this.extractRegion(timezone.iana);
        if (timezoneRegion === userRegion) {
          score += 50; // Boost score for same region as user
        }
      }

      if (hasMatch || (offsetMatch !== null && score > 0)) {
        results.push({ timezone, score });
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    return results.map(result => result.timezone);
  }

  /**
   * Calculate text match score with exact, prefix, and substring matching
   */
  private calculateTextMatchScore(query: string, text: string, baseWeight: number): number {
    if (text === query) {
      return baseWeight * 3; // Exact match gets highest score
    }
    if (text.startsWith(query)) {
      return baseWeight * 2; // Prefix match gets high score
    }
    if (text.includes(query)) {
      return baseWeight; // Substring match gets base score
    }
    return 0;
  }

  /**
   * Parse offset query patterns like GMT-7, UTC+5:30, PDT-7, PST-8, etc.
   */
  private parseOffsetQuery(query: string): number | null {
    // Pattern 1: GMT/UTC followed by offset (GMT-7, UTC+5:30, GMT+0)
    const gmtMatch = query.match(/^(?:gmt|utc)\s*([+-]?\d{1,2}(?:[:.]\d{1,2})?)/);
    if (gmtMatch && gmtMatch[1]) {
      return this.parseOffsetString(gmtMatch[1]);
    }

    // Pattern 2: Timezone abbreviation with offset (PDT-7, PST-8, EST-5, etc.)
    const abbrevMatch = query.match(/^[a-z]{2,4}\s*([+-]?\d{1,2}(?:[:.]\d{1,2})?)/);
    if (abbrevMatch && abbrevMatch[1]) {
      return this.parseOffsetString(abbrevMatch[1]);
    }

    // Pattern 3: Just offset ("+5:30", "-7", "+0")
    const offsetMatch = query.match(/^([+-]?\d{1,2}(?:[:.]\d{1,2})?)$/);
    if (offsetMatch && offsetMatch[1]) {
      return this.parseOffsetString(offsetMatch[1]);
    }

    return null;
  }

  /**
   * Parse offset string like "+5:30", "-7", "+0" into decimal hours
   */
  private parseOffsetString(offsetStr: string): number {
    const cleanStr = offsetStr.replace(/\s/g, '');

    // Handle cases like "+5:30", "-7:00", "+0"
    const match = cleanStr.match(/^([+-]?)(\d{1,2})(?:[:.:](\d{1,2}))?$/);
    if (!match) return 0;

    const sign = match[1] === '-' ? -1 : 1;
    const hours = parseInt(match[2] || '0', 10);
    const minutes = parseInt(match[3] || '0', 10);

    return sign * (hours + minutes / 60);
  }

  /**
   * Extract region from IANA timezone identifier (e.g., "America" from "America/New_York")
   */
  private extractRegion(iana: string): string {
    return iana.split('/')[0] || '';
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
      this.selectTimezone();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    }
  }

  private navigateUp(): void {
    const hasSearch = this.userSearchQuery.trim() !== '';
    if (hasSearch) {
      // Navigate in flat filtered timezones
      this.selectedIndex = (this.selectedIndex - 1 + this.filteredTimezones.length) % this.filteredTimezones.length;
    } else {
      // Navigate in grouped timezones
      this.selectedIndex = (this.selectedIndex - 1 + this.filteredGroups.length) % this.filteredGroups.length;
    }
    this.renderWheel();
  }

  private navigateDown(): void {
    const hasSearch = this.userSearchQuery.trim() !== '';
    if (hasSearch) {
      // Navigate in flat filtered timezones
      this.selectedIndex = (this.selectedIndex + 1) % this.filteredTimezones.length;
    } else {
      // Navigate in grouped timezones
      this.selectedIndex = (this.selectedIndex + 1) % this.filteredGroups.length;
    }
    this.renderWheel();
  }

  private renderWheel(): void {
    this.wheel.innerHTML = '';

    // Determine what to show based on search and mode
    const hasSearch = this.userSearchQuery.trim() !== '';

    if (hasSearch) {
      // Show flat filtered results when searching
      this.renderFlatWheel();
    } else {
      // Show grouped results when not searching
      this.renderGroupedWheel();
    }
  }

  private renderFlatWheel(): void {
    if (this.filteredTimezones.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'wheel-timezone-item center';
      noResults.innerHTML = '<div class="wheel-timezone-name">No timezones found</div>';
      this.wheel.appendChild(noResults);
      return;
    }

    // Show 5 items: 2 above, current (center), 2 below
    const itemsToShow = Math.min(5, this.filteredTimezones.length);
    const centerIndex = Math.floor(itemsToShow / 2); // Index 2 (0-based) for 5 items

    // If we have fewer timezones than display slots, don't duplicate them
    if (this.filteredTimezones.length <= itemsToShow) {
      // Render each timezone only once
      for (let i = 0; i < this.filteredTimezones.length; i++) {
        const timezone = this.filteredTimezones[i];
        if (!timezone) continue;

        const isCenter = i === this.selectedIndex;
        const isAdjacent = Math.abs(i - this.selectedIndex) === 1;
        this.renderTimezoneItem(timezone, isCenter, isAdjacent, i, this.selectedIndex);
      }
    } else {
      // Original circular rendering for when we have many timezones
      for (let i = 0; i < itemsToShow; i++) {
        const timezoneIndex =
          (this.selectedIndex - centerIndex + i + this.filteredTimezones.length) % this.filteredTimezones.length;
        const timezone = this.filteredTimezones[timezoneIndex];

        if (!timezone) continue;

        const isCenter = i === centerIndex;
        this.renderTimezoneItem(timezone, isCenter, i === centerIndex - 1 || i === centerIndex + 1, i, centerIndex);
      }
    }
  }

  private renderGroupedWheel(): void {
    if (this.filteredGroups.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'wheel-timezone-item center';
      noResults.innerHTML = '<div class="wheel-timezone-name">No timezone groups found</div>';
      this.wheel.appendChild(noResults);
      return;
    }

    // Show 5 items: 2 above, current (center), 2 below
    const itemsToShow = Math.min(5, this.filteredGroups.length);
    const centerIndex = Math.floor(itemsToShow / 2);

    // Map selectedIndex to the main timezone for the group

    if (this.filteredGroups.length <= itemsToShow) {
      // Render each group only once
      for (let i = 0; i < this.filteredGroups.length; i++) {
        const group = this.filteredGroups[i];
        if (!group) continue;

        const isCenter = i === Math.min(this.selectedIndex, this.filteredGroups.length - 1);
        const isAdjacent = Math.abs(i - Math.min(this.selectedIndex, this.filteredGroups.length - 1)) === 1;
        this.renderGroupedTimezoneItem(group, isCenter, isAdjacent, i, this.selectedIndex);
      }
    } else {
      // Circular rendering for many groups
      for (let i = 0; i < itemsToShow; i++) {
        const groupIndex =
          (Math.min(this.selectedIndex, this.filteredGroups.length - 1) -
            centerIndex +
            i +
            this.filteredGroups.length) %
          this.filteredGroups.length;
        const group = this.filteredGroups[groupIndex];

        if (!group) continue;

        const isCenter = i === centerIndex;
        this.renderGroupedTimezoneItem(group, isCenter, i === centerIndex - 1 || i === centerIndex + 1, i, centerIndex);
      }
    }
  }

  private renderGroupedTimezoneItem(
    group: GroupedTimezone,
    isCenter: boolean,
    isAdjacent: boolean,
    position: number,
    centerIndex: number,
  ): void {
    const item = document.createElement('div');
    item.className = 'wheel-timezone-item grouped';

    // Add position classes
    if (isCenter) {
      item.classList.add('center');
    } else if (isAdjacent) {
      item.classList.add('adjacent');
    } else {
      item.classList.add('distant');
    }

    // Add current user timezone class if it matches
    if (group.current.iana === this.currentUserTimezone) {
      item.classList.add('current');
    }

    // Format offset for display
    const offsetStr = formatOffset(group.current.offset);

    // Check if abbreviation already contains offset information
    const hasOffsetInAbbreviation = /[+-]\d/.test(group.current.abbreviation);
    const displayText = hasOffsetInAbbreviation
      ? `${group.location} (${group.current.abbreviation})`
      : `${group.location} (${group.current.abbreviation} ${offsetStr})`;

    // Show alternate timezone info if available
    const alternateInfo = group.alternate
      ? ` • ${group.alternate.abbreviation} ${formatOffset(group.alternate.offset)}`
      : '';

    item.innerHTML = `
      <div class="wheel-timezone-name">
        ${displayText}
        ${group.alternate ? '<span class="timezone-plus-btn" title="Select alternate timezone">+</span>' : ''}
      </div>
      <div class="wheel-timezone-display">${group.current.displayName}${alternateInfo}</div>
    `;

    // Handle plus button clicks
    const plusBtn = item.querySelector('.timezone-plus-btn');
    if (plusBtn && group.alternate) {
      plusBtn.addEventListener('click', e => {
        e.stopPropagation();
        // Select the alternate timezone directly and mark as off-cycle
        if (this.onTimezoneSelectedCallback && group.alternate) {
          this.onTimezoneSelectedCallback(group.alternate, true); // Mark alternate as off-cycle
        }
        this.close();
      });
    }

    // Click handler for main item
    item.addEventListener('click', () => {
      if (!isCenter) {
        // Navigate to this group
        const steps = position - centerIndex;
        if (steps > 0) {
          for (let j = 0; j < steps; j++) {
            this.navigateDown();
          }
        } else {
          for (let j = 0; j < Math.abs(steps); j++) {
            this.navigateUp();
          }
        }
      } else {
        // Center item was clicked - select the current timezone for this group
        if (this.onTimezoneSelectedCallback) {
          this.onTimezoneSelectedCallback(group.current);
        }
        this.close();
      }
    });

    this.wheel.appendChild(item);
  }

  private renderTimezoneItem(
    timezone: TimeZone,
    isCenter: boolean,
    isAdjacent: boolean,
    position: number,
    centerIndex: number,
  ): void {
    const item = document.createElement('div');
    item.className = 'wheel-timezone-item';

    // Add position classes
    if (isCenter) {
      item.classList.add('center');
    } else if (isAdjacent) {
      item.classList.add('adjacent');
    } else {
      item.classList.add('distant');
    }

    // Add current user timezone class if it matches
    if (timezone.iana === this.currentUserTimezone) {
      item.classList.add('current');
    }

    // Format offset for display using the existing formatOffset function
    const offsetStr = formatOffset(timezone.offset);

    // Check if abbreviation already contains offset information to avoid duplication
    const hasOffsetInAbbreviation = /[+-]\d/.test(timezone.abbreviation);
    const displayText = hasOffsetInAbbreviation
      ? `${timezone.cityName} (${timezone.abbreviation})`
      : `${timezone.cityName} (${timezone.abbreviation} ${offsetStr})`;

    item.innerHTML = `
      <div class="wheel-timezone-name">
        ${displayText}
      </div>
      <div class="wheel-timezone-display">${timezone.displayName}</div>
    `;

    // Click handler
    item.addEventListener('click', () => {
      if (!isCenter) {
        // Navigate to this timezone
        const steps = position - centerIndex;
        if (steps > 0) {
          for (let j = 0; j < steps; j++) {
            this.navigateDown();
          }
        } else {
          for (let j = 0; j < Math.abs(steps); j++) {
            this.navigateUp();
          }
        }
      } else {
        // Center item was clicked - select this timezone
        this.selectTimezone();
      }
    });

    this.wheel.appendChild(item);
  }

  private selectTimezone(): void {
    const selectedTimezone = this.filteredTimezones[this.selectedIndex];
    if (selectedTimezone) {
      console.log('Selected timezone:', selectedTimezone);

      // Check if this is an off-cycle variant by comparing with grouped timezones
      let isOffCycle = false;
      const matchingGroup = this.groupedTimezones.find(
        group =>
          group.current.iana === selectedTimezone.iana ||
          (group.alternate && group.alternate.iana === selectedTimezone.iana),
      );

      if (matchingGroup && matchingGroup.alternate && matchingGroup.alternate.iana === selectedTimezone.iana) {
        // This is the alternate timezone (off-cycle variant)
        isOffCycle = true;
      }

      if (this.onTimezoneSelectedCallback) {
        this.onTimezoneSelectedCallback(selectedTimezone, isOffCycle);
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

    // Preserve existing search query in the input
    this.input.value = this.userSearchQuery;

    // Focus the input after modal is shown
    setTimeout(() => {
      this.input.focus();
    }, 100);
  }

  public close(): void {
    this.overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * Show custom timezone creation option when offset query has no matches
   */
  private showCustomTimezoneOption(offset: number): void {
    const addCustomItem = document.createElement('div');
    addCustomItem.className = 'timezone-option add-custom-timezone';
    addCustomItem.innerHTML = `
      <div class="custom-timezone-button">
        <span class="add-icon">+</span>
        <div class="add-text">
          <div class="primary-text">Add Custom Timezone</div>
          <div class="offset-text">UTC${offset >= 0 ? '+' : ''}${offset}</div>
        </div>
      </div>
    `;

    addCustomItem.addEventListener('click', () => this.showCustomTimezoneForm(offset));

    // Clear wheel and add the custom option
    this.wheel.innerHTML = '';
    this.wheel.appendChild(addCustomItem);

    // Add "selected" class for consistency
    addCustomItem.classList.add('selected');
  }

  /**
   * Show expanded form for creating custom timezone
   */
  private showCustomTimezoneForm(offset: number): void {
    const formContainer = document.createElement('div');
    formContainer.className = 'custom-timezone-form';
    formContainer.innerHTML = `
      <div class="form-header">
        <h3>Add Custom Timezone</h3>
        <div class="offset-display">UTC${offset >= 0 ? '+' : ''}${offset}</div>
      </div>
      <div class="form-fields">
        <div class="field-group">
          <label for="custom-name">Custom Name:</label>
          <input type="text" id="custom-name" placeholder="Enter a name for this timezone" />
        </div>
        <div class="field-group">
          <label for="custom-latitude">Latitude (optional):</label>
          <input type="number" id="custom-latitude" placeholder="e.g., 40.7128" min="-90" max="90" step="0.0001" />
        </div>
        <div class="field-group">
          <label for="custom-longitude">Longitude (optional):</label>
          <input type="number" id="custom-longitude" placeholder="e.g., -74.0060" min="-180" max="180" step="0.0001" />
        </div>
      </div>
      <div class="form-actions">
        <button type="button" id="cancel-custom">Cancel</button>
        <button type="button" id="add-custom">Add Timezone</button>
      </div>
    `;

    // Replace wheel content with form
    this.wheel.innerHTML = '';
    this.wheel.appendChild(formContainer);

    // Set up form handlers
    const nameInput = formContainer.querySelector('#custom-name') as HTMLInputElement;
    const latInput = formContainer.querySelector('#custom-latitude') as HTMLInputElement;
    const lngInput = formContainer.querySelector('#custom-longitude') as HTMLInputElement;
    const cancelBtn = formContainer.querySelector('#cancel-custom') as HTMLButtonElement;
    const addBtn = formContainer.querySelector('#add-custom') as HTMLButtonElement;

    // Focus name input
    nameInput.focus();

    cancelBtn.addEventListener('click', () => {
      // Go back to showing add custom option
      this.showCustomTimezoneOption(offset);
    });

    addBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }

      // Parse coordinates if provided
      let coordinates: { latitude: number; longitude: number } | undefined;
      const lat = parseFloat(latInput.value);
      const lng = parseFloat(lngInput.value);

      if (!isNaN(lat) && !isNaN(lng)) {
        coordinates = { latitude: lat, longitude: lng };
      }

      this.createCustomTimezone(offset, name, coordinates);
    });

    // Allow Enter to submit
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        addBtn.click();
      }
    });
  }

  /**
   * Create and save custom timezone
   */
  private createCustomTimezone(
    offset: number,
    name: string,
    coordinates?: { latitude: number; longitude: number },
  ): void {
    const customTimezone: TimeZone = {
      name: `${name} (UTC${offset >= 0 ? '+' : ''}${offset})`,
      offset,
      displayName: `${name} Standard Time`,
      iana: `custom-${offset}`,
      cityName: name,
      abbreviation: `UTC${offset >= 0 ? '+' : ''}${offset}`,
      isCustom: true,
      ...(coordinates ? { coordinates } : {}),
    };

    // Save to localStorage
    CustomTimezoneManager.saveCustomTimezone(customTimezone);

    // Add to current timezones list
    this.timezones.push(customTimezone);

    // Select the new timezone
    this.filteredTimezones = [customTimezone];
    this.selectedIndex = 0;
    this.renderWheel();

    // Auto-select and close modal
    if (this.onTimezoneSelectedCallback) {
      this.onTimezoneSelectedCallback(customTimezone);
    }
    this.close();
  }

  public getSelectedTimezone(): TimeZone | null {
    return this.filteredTimezones[this.selectedIndex] || null;
  }
}

/**
 * DateTime Modal - Handles date and time selection
 */
export class DateTimeModal {
  private modal: HTMLElement;
  private overlay: HTMLElement;
  private input: HTMLInputElement;
  private selectButton: HTMLElement;
  private cancelButton: HTMLElement;
  private closeButton: HTMLElement | null = null;
  private onDateTimeSelectedCallback: ((dateTime: Date) => void) | undefined;

  constructor(onDateTimeSelected?: (dateTime: Date) => void) {
    this.modal = document.getElementById('datetime-modal') as HTMLElement;
    this.overlay = document.getElementById('datetime-modal-overlay') as HTMLElement;
    this.input = document.getElementById('datetime-input') as HTMLInputElement;
    this.selectButton = document.getElementById('select-datetime') as HTMLElement;
    this.cancelButton = document.getElementById('cancel-datetime') as HTMLElement;

    // Check if modal exists before trying to query it (for tests)
    if (this.modal) {
      this.closeButton = this.modal.querySelector('.modal-close') as HTMLElement;
    }

    this.onDateTimeSelectedCallback = onDateTimeSelected;

    // Only setup event listeners if elements exist
    if (this.modal && this.overlay && this.input && this.selectButton && this.cancelButton) {
      this.setupEventListeners();
    }
  }

  private setupEventListeners(): void {
    // Close modal when clicking overlay
    this.overlay.addEventListener('click', event => this.handleOverlayClick(event));

    // Close modal when clicking close button
    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => this.close());
    }

    // Cancel button
    this.cancelButton.addEventListener('click', () => this.close());

    // Select button
    this.selectButton.addEventListener('click', () => this.selectDateTime());

    // Handle keyboard events
    this.modal.addEventListener('keydown', e => this.handleKeyDown(e));

    // Handle form submission
    this.input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.selectDateTime();
      }
    });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  private handleOverlayClick(event: Event): void {
    if (event.target === this.overlay) {
      this.close();
    }
  }

  private selectDateTime(): void {
    if (this.input && this.input.value) {
      // Create date from the datetime-local input value
      const selectedDateTime = new Date(this.input.value);

      if (this.onDateTimeSelectedCallback) {
        this.onDateTimeSelectedCallback(selectedDateTime);
      }
    }
    this.close();
  }

  public open(): void {
    // Return early if modal doesn't exist (for tests)
    if (!this.modal || !this.overlay || !this.input) {
      return;
    }

    // Set current datetime as default if no value is set
    if (!this.input.value) {
      const now = new Date();
      // Format to datetime-local format (YYYY-MM-DDTHH:MM)
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      this.input.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    this.overlay.classList.add('active');
    this.modal.focus();
    document.body.style.overflow = 'hidden';

    // Focus the input after a short delay to ensure it's visible
    setTimeout(() => {
      this.input.focus();
    }, 100);
  }

  public close(): void {
    // Return early if modal doesn't exist (for tests)
    if (!this.overlay) {
      return;
    }

    this.overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  public setDateTime(dateTime: Date): void {
    // Return early if input doesn't exist (for tests)
    if (!this.input) {
      return;
    }

    const year = dateTime.getFullYear();
    const month = String(dateTime.getMonth() + 1).padStart(2, '0');
    const day = String(dateTime.getDate()).padStart(2, '0');
    const hours = String(dateTime.getHours()).padStart(2, '0');
    const minutes = String(dateTime.getMinutes()).padStart(2, '0');
    this.input.value = `${year}-${month}-${day}T${hours}:${minutes}`;
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
  'America/Hermosillo': { latitude: 29.0729, longitude: -110.9559, city: 'Hermosillo' },
  'America/Bahia_Banderas': { latitude: 20.7039, longitude: -105.34, city: 'Bahia Banderas' },
  'Pacific/Gambier': { latitude: -23.12, longitude: -134.97, city: 'Gambier Islands' },

  // Europe - Major populated cities
  'Europe/London': { latitude: 51.5074, longitude: -0.1278, city: 'London' },
  'Europe/Paris': { latitude: 48.8566, longitude: 2.3522, city: 'Paris' },
  'Europe/Berlin': { latitude: 52.52, longitude: 13.405, city: 'Berlin' },
  'Europe/Rome': { latitude: 41.9028, longitude: 12.4964, city: 'Rome' },
  'Europe/Madrid': { latitude: 40.4168, longitude: -3.7038, city: 'Madrid' },
  'Europe/Moscow': { latitude: 55.7558, longitude: 37.6176, city: 'Moscow' },

  // Additional timezone coordinates for common timezones
  'America/Argentina/La_Rioja': { latitude: -29.4315, longitude: -66.8506, city: 'La Rioja' },
  'America/Argentina/Buenos_Aires': { latitude: -34.6118, longitude: -58.396, city: 'Buenos Aires' },
  'America/Argentina/Cordoba': { latitude: -31.4201, longitude: -64.1888, city: 'Córdoba' },
  'Etc/UTC': { latitude: 51.4769, longitude: -0.0005, city: 'Greenwich' }, // Use Greenwich for UTC
  UTC: { latitude: 51.4769, longitude: -0.0005, city: 'Greenwich' }, // Use Greenwich for UTC

  // Asia - Major populated cities
  'Asia/Tokyo': { latitude: 35.6762, longitude: 139.6503, city: 'Tokyo' },
  'Asia/Shanghai': { latitude: 31.2304, longitude: 121.4737, city: 'Shanghai' },
  'Asia/Hong_Kong': { latitude: 22.3193, longitude: 114.1694, city: 'Hong Kong' },
  'Asia/Singapore': { latitude: 1.3521, longitude: 103.8198, city: 'Singapore' },
  'Asia/Seoul': { latitude: 37.5665, longitude: 126.978, city: 'Seoul' },
  'Asia/Kolkata': { latitude: 22.5726, longitude: 88.3639, city: 'Kolkata' },
  'Asia/Dubai': { latitude: 25.2048, longitude: 55.2708, city: 'Dubai' },
  'Asia/Yerevan': { latitude: 40.1792, longitude: 44.4991, city: 'Yerevan' },
  'Asia/Anadyr': { latitude: 64.7333, longitude: 177.5067, city: 'Anadyr' },

  // Australia/Pacific - Major populated cities
  'Australia/Sydney': { latitude: -33.8688, longitude: 151.2093, city: 'Sydney' },
  'Australia/Melbourne': { latitude: -37.8136, longitude: 144.9631, city: 'Melbourne' },
  'Pacific/Auckland': { latitude: -36.8485, longitude: 174.7633, city: 'Auckland' },
  'Pacific/Honolulu': { latitude: 21.3099, longitude: -157.8581, city: 'Honolulu' },

  // Africa - Major populated cities
  'Africa/Cairo': { latitude: 30.0444, longitude: 31.2357, city: 'Cairo' },
  'Africa/Lagos': { latitude: 6.5244, longitude: 3.3792, city: 'Lagos' },
  'Africa/Johannesburg': { latitude: -26.2041, longitude: 28.0473, city: 'Johannesburg' },

  // Additional Pacific and remote timezones
  'Pacific/Rarotonga': { latitude: -21.2367, longitude: -159.7777, city: 'Rarotonga' },
  'Pacific/Marquesas': { latitude: -9.0, longitude: -140.0, city: 'Marquesas' },
  'America/St_Johns': { latitude: 47.5615, longitude: -52.7126, city: 'St. Johns' },
  'Australia/Eucla': { latitude: -31.6833, longitude: 128.8833, city: 'Eucla' },
  'Pacific/Dili': { latitude: -8.5569, longitude: 125.5603, city: 'Dili' },
  'Australia/Lord_Howe': { latitude: -31.5556, longitude: 159.0833, city: 'Lord Howe Island' },
  'Pacific/Niue': { latitude: -19.0544, longitude: -169.8672, city: 'Niue' },
  'America/Eirunepe': { latitude: -6.6608, longitude: -69.8739, city: 'Eirunepe' },
  'America/Boa_Vista': { latitude: 2.8197, longitude: -60.6733, city: 'Boa Vista' },
  'America/Noronha': { latitude: -3.8536, longitude: -32.4297, city: 'Fernando de Noronha' },
  'Atlantic/Cape_Verde': { latitude: 14.9215, longitude: -23.5087, city: 'Cape Verde' },
  'Asia/Katmandu': { latitude: 27.7172, longitude: 85.324, city: 'Kathmandu' },
  'Asia/Dhaka': { latitude: 23.8103, longitude: 90.4125, city: 'Dhaka' },
  'Antarctica/Casey': { latitude: -66.2818, longitude: 110.5276, city: 'Casey Station' },
  'Pacific/Kiritimati': { latitude: 1.8721, longitude: -157.4278, city: 'Kiritimati' },
};

/**
 * Get sunrise and sunset times for a specific date and timezone
 * @param timezone Timezone to calculate for
 * @param date Date to calculate sunrise/sunset for
 * @returns Object with sunrise and sunset times, or null if coordinates unavailable
 */
function getSunriseSunsetTimes(timezone: TimeZone, date: Date): { sunrise: Date; sunset: Date } | null {
  // Check for coordinates in custom timezones first, then fall back to TIMEZONE_COORDINATES
  let coordinates = timezone.coordinates || TIMEZONE_COORDINATES[timezone.iana];

  if (!coordinates) {
    return null; // No coordinates available for this timezone
  }

  const { latitude, longitude } = coordinates;

  try {
    // Get sun times for the date at the coordinates
    const sunTimes = SunCalc.getTimes(date, latitude, longitude);

    return {
      sunrise: sunTimes.sunrise,
      sunset: sunTimes.sunset,
    };
  } catch {
    return null; // SunCalc failed
  }
}

/**
 * Format time for display in timezone-aware format
 * @param date Date to format
 * @param timezone IANA timezone identifier
 * @returns Formatted time string (e.g., "6:42 AM")
 */
function formatTimeInTimezone(date: Date, timezone: string): string {
  return date.toLocaleString('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Calculate if a specific hour in a timezone is during daylight using SunCalc
 * @param timezone Timezone to check (must have entry in TIMEZONE_COORDINATES)
 * @param hourDate Date/time to check for daylight status (represents local time in the timezone)
 * @returns true if hour is during daylight, false if night or no coordinates available
 */
function isHourInDaylight(timezone: TimeZone, hourDate: Date): boolean {
  // Check for coordinates in custom timezones first, then fall back to TIMEZONE_COORDINATES
  let coordinates = timezone.coordinates || TIMEZONE_COORDINATES[timezone.iana];

  if (!coordinates) {
    return false; // Default to night for unmapped timezones (including custom ones without coordinates)
  }

  const { latitude, longitude } = coordinates;

  try {
    // Extract the calendar date from hourDate for SunCalc
    const year = hourDate.getFullYear();
    const month = hourDate.getMonth();
    const day = hourDate.getDate();
    const hours = hourDate.getHours();
    const minutes = hourDate.getMinutes();

    // Create a proper UTC date for the calendar date to pass to SunCalc
    const calendarDate = new Date(Date.UTC(year, month, day, 12, 0, 0));

    // Get sun times for this calendar date at the coordinates (returns UTC times)
    const sunTimes = SunCalc.getTimes(calendarDate, latitude, longitude);

    // Convert the local time (hourDate) to the equivalent UTC time for comparison
    // The hourDate represents local time in the timezone, so we need to subtract the offset to get UTC
    const localTimeUTC = new Date(Date.UTC(year, month, day, hours, minutes));
    const actualUTC = new Date(localTimeUTC.getTime() - timezone.offset * 60 * 60 * 1000);

    // Compare the actual UTC time with sunrise/sunset UTC times
    return actualUTC >= sunTimes.sunrise && actualUTC <= sunTimes.sunset;
  } catch (error) {
    // Fallback to simple calculation if SunCalc fails
    console.warn(`SunCalc failed for timezone ${timezone.iana}:`, error);
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
