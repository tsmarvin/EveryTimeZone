/**
 * Hybrid Grid Timeline Implementation - Option 2
 *
 * This module provides a hybrid grid timeline that maintains the familiar
 * grid structure while adding visual indicators and sub-grid positioning
 * for non-even-hour offsets.
 */

import { TimeZone, TimelineHour, generateTimelineHours, getUserTimezone } from './index.js';
import { SettingsPanel } from './settings.js';

/**
 * Enhanced timeline hour with offset positioning for hybrid grid
 */
export interface HybridTimelineHour extends TimelineHour {
  /** Whether this hour represents a fractional offset position */
  isFractionalOffset: boolean;
  /** The fractional part of the offset (0 for even hours, 0.5 for 30min, 0.75 for 45min) */
  fractionalOffset: number;
}

/**
 * Enhanced timeline row for hybrid grid display
 */
export interface HybridTimelineRow {
  timezone: TimeZone;
  hours: HybridTimelineHour[];
  isUserTimezone: boolean;
  /** True if this timezone has non-even-hour offset */
  hasNonEvenOffset: boolean;
  /** The fractional part of the timezone offset */
  offsetFraction: number;
}

/**
 * Generate hybrid timeline hours with fractional offset information
 * @param numHours Number of hours to display
 * @param timezone Target timezone
 * @param baseDate Base date for calculations
 * @returns Array of hybrid timeline hours with offset data
 */
export function generateHybridTimelineHours(
  numHours: number,
  timezone: TimeZone,
  baseDate?: Date,
): HybridTimelineHour[] {
  const standardHours = generateTimelineHours(numHours, timezone, baseDate);
  const fractionalOffset = Math.abs(timezone.offset - Math.floor(timezone.offset));

  return standardHours.map(hour => ({
    ...hour,
    isFractionalOffset: fractionalOffset > 0,
    fractionalOffset: fractionalOffset,
  }));
}

/**
 * Create hybrid timeline data
 * @param numHours Number of hours to display
 * @param numRows Number of timezone rows
 * @param timezones Array of timezones to display
 * @param baseDate Base date for calculations
 * @returns Array of hybrid timeline rows
 */
export function createHybridTimelineData(
  numHours: number,
  numRows: number,
  timezones: TimeZone[],
  baseDate?: Date,
): HybridTimelineRow[] {
  const userTz = getUserTimezone();

  return timezones.map(timezone => {
    const offsetFraction = Math.abs(timezone.offset - Math.floor(timezone.offset));
    const hasNonEvenOffset = offsetFraction > 0;

    return {
      timezone,
      hours: generateHybridTimelineHours(numHours, timezone, baseDate),
      isUserTimezone: timezone.iana === userTz.iana,
      hasNonEvenOffset,
      offsetFraction,
    };
  });
}

/**
 * Render hybrid grid timeline visualization
 * @param container Timeline container element
 * @param timelineData Hybrid timeline data
 */
export function renderHybridTimeline(container: HTMLElement, timelineData: HybridTimelineRow[]): void {
  // Clear container
  container.innerHTML = '';

  // Add hybrid timeline class for CSS targeting
  container.classList.add('hybrid-timeline');

  // Get current time format setting
  const settings = SettingsPanel.getCurrentSettings();
  const timeFormat = settings?.timeFormat || '12h';

  // Create sub-grid header showing half-hour markers
  const headerRow = document.createElement('div');
  headerRow.className = 'hybrid-timeline-header';

  // Add timezone label spacer
  const labelSpacer = document.createElement('div');
  labelSpacer.className = 'hybrid-timezone-label-spacer';
  headerRow.appendChild(labelSpacer);

  // Add hour cells with sub-grid markers
  for (let i = 0; i < 48; i++) {
    const hourCell = document.createElement('div');
    hourCell.className = 'hybrid-hour-header';

    // Add sub-grid markers for 30-minute intervals
    const halfHourMarker = document.createElement('div');
    halfHourMarker.className = 'half-hour-marker';
    hourCell.appendChild(halfHourMarker);

    // Add quarter-hour markers for 45-minute offsets
    const quarterHour1 = document.createElement('div');
    quarterHour1.className = 'quarter-hour-marker quarter-1';
    hourCell.appendChild(quarterHour1);

    const quarterHour3 = document.createElement('div');
    quarterHour3.className = 'quarter-hour-marker quarter-3';
    hourCell.appendChild(quarterHour3);

    headerRow.appendChild(hourCell);
  }

  container.appendChild(headerRow);

  // Create timeline rows
  timelineData.forEach(row => {
    const rowElement = document.createElement('div');
    rowElement.className = 'timeline-row hybrid-timeline-row';

    if (row.isUserTimezone) {
      rowElement.classList.add('user-timezone');
    }

    if (row.hasNonEvenOffset) {
      rowElement.classList.add('non-even-offset');
      rowElement.setAttribute('data-offset-fraction', row.offsetFraction.toString());
    }

    // Timezone label with offset indicator
    const labelCell = document.createElement('div');
    labelCell.className = 'timeline-cell timeline-timezone-label hybrid-timezone-label';

    const offsetIndicator = row.hasNonEvenOffset ? getOffsetTypeIndicator(row.offsetFraction) : '';

    labelCell.innerHTML = `
      <div class="timezone-info">
        <div class="timezone-name">${row.timezone.cityName}</div>
        <div class="timezone-offset">${row.timezone.displayName} (${formatOffset(row.timezone.offset)})</div>
        ${row.hasNonEvenOffset ? `<div class="offset-type-indicator">${offsetIndicator}</div>` : ''}
      </div>
    `;
    rowElement.appendChild(labelCell);

    // Hour cells with enhanced positioning
    row.hours.forEach((hour, index) => {
      const hourCell = document.createElement('div');
      hourCell.className = 'timeline-cell timeline-hour hybrid-hour';

      // Use consistent format based on setting
      hourCell.textContent = timeFormat === '12h' ? hour.time12 : hour.time24;

      // Mark current hour (index 24)
      if (index === 24) {
        hourCell.classList.add('current-hour');
      }

      // Add working hours class
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

      // Add fractional offset styling and positioning
      if (hour.isFractionalOffset) {
        hourCell.classList.add('fractional-offset');

        // Add specific classes for different offset types
        if (hour.fractionalOffset === 0.5) {
          hourCell.classList.add('half-hour-offset');
        } else if (hour.fractionalOffset === 0.75) {
          hourCell.classList.add('three-quarter-offset');
        } else if (hour.fractionalOffset === 0.25) {
          hourCell.classList.add('quarter-hour-offset');
        }

        // Add visual offset indicator
        const offsetIndicator = document.createElement('div');
        offsetIndicator.className = 'fractional-offset-indicator';
        offsetIndicator.title = `Offset: ${Math.round(hour.fractionalOffset * 60)} minutes`;
        hourCell.appendChild(offsetIndicator);
      }

      rowElement.appendChild(hourCell);
    });

    container.appendChild(rowElement);
  });

  // Apply dynamic width calculation
  adjustHybridTimezoneLabelWidths();

  // Scroll to current hour position
  const currentHourPosition = getCellWidth() * 24;
  container.scrollLeft = Math.max(0, currentHourPosition - container.clientWidth / 4);
}

/**
 * Get offset type indicator for display
 * @param fraction Fractional part of offset
 * @returns Visual indicator string
 */
function getOffsetTypeIndicator(fraction: number): string {
  if (fraction === 0.5) {
    return '⏰ +30min';
  } else if (fraction === 0.75) {
    return '⏰ +45min';
  } else if (fraction === 0.25) {
    return '⏰ +15min';
  } else {
    return `⏰ +${Math.round(fraction * 60)}min`;
  }
}

/**
 * Get cell width for hybrid timeline (same as standard timeline)
 * @returns Cell width in pixels
 */
function getCellWidth(): number {
  const screenWidth = window.innerWidth;

  if (screenWidth >= 1400) {
    return 120;
  } else if (screenWidth >= 992) {
    return 100;
  } else if (screenWidth >= 768) {
    return 90;
  } else {
    return 60;
  }
}

/**
 * Adjust timezone label widths for hybrid timeline
 */
function adjustHybridTimezoneLabelWidths(): void {
  const timezoneLabelCells = document.querySelectorAll('.hybrid-timeline-row .timeline-timezone-label');
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
  const padding = 32;
  let minWidth: number;

  if (screenWidth <= 576) {
    minWidth = 140;
  } else if (screenWidth <= 768) {
    minWidth = 180;
  } else if (screenWidth <= 992) {
    minWidth = 200;
  } else if (screenWidth <= 1400) {
    minWidth = 220;
  } else {
    minWidth = 240;
  }

  const optimalWidth = Math.max(maxWidth + padding, minWidth);

  // Apply the calculated width to all timezone label cells
  timezoneLabelCells.forEach(cell => {
    (cell as HTMLElement).style.minWidth = `${optimalWidth}px`;
    (cell as HTMLElement).style.width = `${optimalWidth}px`;
  });
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
