/**
 * Continuous Timeline Implementation - Option 1
 *
 * This module provides a continuous timeline visualization that accurately
 * represents fractional hour offsets using precise positioning instead of
 * fixed-width grid cells.
 */

import { TimeZone, TimelineHour, generateTimelineHours, getUserTimezone } from './index.js';
import { SettingsPanel } from './settings.js';

/**
 * Enhanced timeline hour with precise positioning data
 */
export interface ContinuousTimelineHour extends TimelineHour {
  /** Precise position in the continuous timeline (0-48 scale) */
  position: number;
  /** Visual offset from standard position for non-even-hour timezones */
  offsetPosition: number;
}

/**
 * Enhanced timeline row for continuous display
 */
export interface ContinuousTimelineRow {
  timezone: TimeZone;
  hours: ContinuousTimelineHour[];
  isUserTimezone: boolean;
  /** True if this timezone has non-even-hour offset */
  hasNonEvenOffset: boolean;
}

/**
 * Generate continuous timeline hours with precise positioning
 * @param numHours Number of hours to display
 * @param timezone Target timezone
 * @param baseDate Base date for calculations
 * @returns Array of continuous timeline hours with positioning data
 */
export function generateContinuousTimelineHours(
  numHours: number,
  timezone: TimeZone,
  baseDate?: Date,
): ContinuousTimelineHour[] {
  const standardHours = generateTimelineHours(numHours, timezone, baseDate);
  const userTz = getUserTimezone();

  return standardHours.map((hour, index) => {
    // Calculate precise position based on actual offset difference
    const basePosition = index;

    // Calculate the fractional offset difference from user timezone
    const offsetDifference = timezone.offset - userTz.offset;
    const fractionalOffset = offsetDifference - Math.floor(offsetDifference);

    // Position adjustment for fractional offsets
    const offsetPosition = basePosition + fractionalOffset;

    return {
      ...hour,
      position: basePosition,
      offsetPosition: offsetPosition,
    };
  });
}

/**
 * Create continuous timeline data
 * @param numHours Number of hours to display
 * @param numRows Number of timezone rows
 * @param timezones Array of timezones to display
 * @param baseDate Base date for calculations
 * @returns Array of continuous timeline rows
 */
export function createContinuousTimelineData(
  numHours: number,
  numRows: number,
  timezones: TimeZone[],
  baseDate?: Date,
): ContinuousTimelineRow[] {
  const userTz = getUserTimezone();

  return timezones.map(timezone => {
    const fractionalPart = Math.abs(timezone.offset - Math.floor(timezone.offset));
    const hasNonEvenOffset = fractionalPart > 0;

    return {
      timezone,
      hours: generateContinuousTimelineHours(numHours, timezone, baseDate),
      isUserTimezone: timezone.iana === userTz.iana,
      hasNonEvenOffset,
    };
  });
}

/**
 * Render continuous timeline visualization
 * @param container Timeline container element
 * @param timelineData Continuous timeline data
 */
export function renderContinuousTimeline(container: HTMLElement, timelineData: ContinuousTimelineRow[]): void {
  // Clear container
  container.innerHTML = '';

  // Add continuous timeline class for CSS targeting
  container.classList.add('continuous-timeline');

  // Get current time format setting
  const settings = SettingsPanel.getCurrentSettings();
  const timeFormat = settings?.timeFormat || '12h';

  // Calculate timeline width based on 48 hours
  const hourWidth = getContinuousHourWidth();
  const timelineWidth = 48 * hourWidth;

  // Create timeline header with hour markers
  const headerRow = document.createElement('div');
  headerRow.className = 'continuous-timeline-header';
  headerRow.style.width = `${timelineWidth}px`;

  // Add timezone label spacer
  const labelSpacer = document.createElement('div');
  labelSpacer.className = 'continuous-timezone-label-spacer';
  headerRow.appendChild(labelSpacer);

  // Add hour markers (every 2 hours for readability)
  for (let i = 0; i < 48; i += 2) {
    const marker = document.createElement('div');
    marker.className = 'continuous-hour-marker';
    marker.style.left = `${i * hourWidth}px`;

    // Show time at this position for user timezone
    const baseTime = new Date();
    baseTime.setHours(baseTime.getHours() - 24 + i, 0, 0, 0);

    const timeStr =
      timeFormat === '12h'
        ? baseTime.toLocaleString('en-US', { hour: 'numeric', hour12: true })
        : baseTime.toLocaleString('en-US', { hour: '2-digit', hour12: false });

    marker.textContent = timeStr;
    headerRow.appendChild(marker);
  }

  container.appendChild(headerRow);

  // Create timeline rows
  timelineData.forEach(row => {
    const rowElement = document.createElement('div');
    rowElement.className = 'continuous-timeline-row';
    rowElement.style.width = `${timelineWidth}px`;

    if (row.isUserTimezone) {
      rowElement.classList.add('user-timezone');
    }

    if (row.hasNonEvenOffset) {
      rowElement.classList.add('non-even-offset');
    }

    // Timezone label
    const labelCell = document.createElement('div');
    labelCell.className = 'continuous-timezone-label';
    labelCell.innerHTML = `
      <div class="timezone-info">
        <div class="timezone-name">${row.timezone.cityName}</div>
        <div class="timezone-offset">${row.timezone.displayName} (${formatOffset(row.timezone.offset)})</div>
        ${row.hasNonEvenOffset ? '<div class="offset-indicator">⏰ Non-even offset</div>' : ''}
      </div>
    `;
    rowElement.appendChild(labelCell);

    // Hour positions container
    const hoursContainer = document.createElement('div');
    hoursContainer.className = 'continuous-hours-container';
    hoursContainer.style.width = `${timelineWidth}px`;

    // Add hour elements with precise positioning
    row.hours.forEach((hour, index) => {
      const hourElement = document.createElement('div');
      hourElement.className = 'continuous-hour';

      // Position based on offset
      const leftPosition = hour.offsetPosition * hourWidth;
      hourElement.style.left = `${leftPosition}px`;

      // Use consistent format based on setting
      hourElement.textContent = timeFormat === '12h' ? hour.time12 : hour.time24;

      // Mark current hour (index 24)
      if (index === 24) {
        hourElement.classList.add('current-hour');
      }

      // Add working hours class
      if (hour.hour >= 9 && hour.hour < 17) {
        hourElement.classList.add('working-hours');
      }

      // Add daylight/night indicator
      if (hour.isDaylight !== undefined) {
        if (hour.isDaylight) {
          hourElement.classList.add('daylight-hour');
          hourElement.title = 'Daylight hours';
        } else {
          hourElement.classList.add('night-hour');
          hourElement.title = 'Night hours';
        }
      }

      // Add special styling for non-even offset
      if (row.hasNonEvenOffset) {
        hourElement.classList.add('offset-hour');
      }

      hoursContainer.appendChild(hourElement);
    });

    rowElement.appendChild(hoursContainer);
    container.appendChild(rowElement);
  });

  // Scroll to current hour position
  const currentHourPosition = 24 * hourWidth;
  container.scrollLeft = Math.max(0, currentHourPosition - container.clientWidth / 4);
}

/**
 * Get hour width for continuous timeline
 * @returns Width in pixels for each hour in the continuous timeline
 */
function getContinuousHourWidth(): number {
  const screenWidth = window.innerWidth;

  // Larger widths for continuous timeline to accommodate precise positioning
  if (screenWidth >= 1400) {
    return 80; // Extra large devices
  } else if (screenWidth >= 992) {
    return 70; // Large devices
  } else if (screenWidth >= 768) {
    return 60; // Medium devices
  } else {
    return 50; // Small devices
  }
}

/**
 * Format UTC offset for display
 * @param offset UTC offset in hours
 * @returns Formatted offset string
 */
function formatOffset(offset: number): string {
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hours = Math.floor(absOffset);
  const minutes = Math.round((absOffset - hours) * 60);

  if (minutes === 0) {
    return `${sign}${hours}`;
  }

  return `${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
}
