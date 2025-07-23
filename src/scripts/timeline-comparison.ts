/**
 * Timeline Comparison Mode - Option 3
 *
 * This module provides a side-by-side comparison view showing
 * time differences between timezones with visual indicators
 * for overlapping work hours and meeting times.
 */

import { TimeZone, TimelineHour, generateTimelineHours, getUserTimezone } from './index.js';
import { SettingsPanel } from './settings.js';

/**
 * Enhanced timeline data for comparison mode
 */
export interface ComparisonTimelineRow {
  timezone: TimeZone;
  hours: TimelineHour[];
  isUserTimezone: boolean;
  workingHours: number[]; // Array of hour indices that are working hours (9-17)
  businessOverlap: number[]; // Hours that overlap with user's business hours
  differenceFromUser: number; // Hour difference from user timezone
}

/**
 * Create comparison timeline data with business hour analysis
 * @param numHours Number of hours to display
 * @param timezones Array of timezones to display
 * @param baseDate Base date for calculations
 * @returns Array of comparison timeline rows
 */
export function createComparisonTimelineData(
  numHours: number,
  timezones: TimeZone[],
  baseDate?: Date,
): ComparisonTimelineRow[] {
  const userTz = getUserTimezone();
  const userTimezoneFull = timezones.find(tz => tz.iana === userTz.iana) || userTz;

  return timezones.map(timezone => {
    const hours = generateTimelineHours(numHours, timezone, baseDate);
    const workingHours: number[] = [];
    const businessOverlap: number[] = [];

    // Calculate working hours (9 AM - 5 PM)
    hours.forEach((hour, index) => {
      if (hour.hour >= 9 && hour.hour < 17) {
        workingHours.push(index);
      }
    });

    // Calculate business overlap with user timezone
    if (timezone.iana !== userTimezoneFull.iana) {
      const userHours = generateTimelineHours(numHours, userTimezoneFull, baseDate);
      hours.forEach((hour, index) => {
        const userHour = userHours[index];
        if (userHour && hour.hour >= 9 && hour.hour < 17 && userHour.hour >= 9 && userHour.hour < 17) {
          businessOverlap.push(index);
        }
      });
    }

    const differenceFromUser = timezone.offset - userTimezoneFull.offset;

    return {
      timezone,
      hours,
      isUserTimezone: timezone.iana === userTz.iana,
      workingHours,
      businessOverlap,
      differenceFromUser,
    };
  });
}

/**
 * Render comparison timeline visualization
 * @param container Timeline container element
 * @param timelineData Comparison timeline data
 */
export function renderComparisonTimeline(container: HTMLElement, timelineData: ComparisonTimelineRow[]): void {
  // Clear container
  container.innerHTML = '';

  // Add comparison timeline class for CSS targeting
  container.classList.add('comparison-timeline');

  // Get current time format setting
  const settings = SettingsPanel.getCurrentSettings();
  const timeFormat = settings?.timeFormat || '12h';

  // Create header with timezone comparison info
  const headerSection = document.createElement('div');
  headerSection.className = 'comparison-header';

  const userTimezone = timelineData.find(row => row.isUserTimezone);
  if (userTimezone) {
    headerSection.innerHTML = `
      <div class="comparison-info">
        <h3>📊 Timeline Comparison</h3>
        <p>Comparing all timezones against <strong>${userTimezone.timezone.cityName}</strong> (${formatOffset(userTimezone.timezone.offset)})</p>
        <div class="legend">
          <span class="legend-item"><span class="overlap-indicator"></span> Business Hour Overlap</span>
          <span class="legend-item"><span class="work-hours-indicator"></span> Working Hours (9 AM - 5 PM)</span>
          <span class="legend-item"><span class="non-even-indicator"></span> Non-even Hour Offset</span>
        </div>
      </div>
    `;
  }
  container.appendChild(headerSection);

  // Create comparison grid
  const comparisonGrid = document.createElement('div');
  comparisonGrid.className = 'comparison-grid';

  // Sort timezones by offset for logical comparison
  const sortedData = [...timelineData].sort((a, b) => a.timezone.offset - b.timezone.offset);

  sortedData.forEach(row => {
    const comparisonRow = document.createElement('div');
    comparisonRow.className = 'comparison-row';

    if (row.isUserTimezone) {
      comparisonRow.classList.add('user-timezone');
    }

    // Left panel with timezone info and difference
    const infoPanel = document.createElement('div');
    infoPanel.className = 'comparison-info-panel';

    const offsetFraction = Math.abs(row.timezone.offset - Math.floor(row.timezone.offset));
    const hasNonEvenOffset = offsetFraction > 0;
    const timeDifferenceText = getTimeDifferenceText(row.differenceFromUser);
    const overlapHours = row.businessOverlap.length;

    infoPanel.innerHTML = `
      <div class="timezone-header">
        <div class="timezone-name">${row.timezone.cityName}</div>
        <div class="timezone-details">
          ${row.timezone.displayName} (${formatOffset(row.timezone.offset)})
          ${hasNonEvenOffset ? `<span class="non-even-badge">⏰ ${formatNonEvenOffset(offsetFraction)}</span>` : ''}
        </div>
      </div>
      <div class="comparison-stats">
        <div class="time-difference">${timeDifferenceText}</div>
        <div class="overlap-info">
          ${overlapHours > 0 ? `<span class="overlap-positive">✅ ${overlapHours} hours business overlap</span>` : '<span class="overlap-negative">❌ No business overlap</span>'}
        </div>
      </div>
    `;

    comparisonRow.appendChild(infoPanel);

    // Right panel with timeline
    const timelinePanel = document.createElement('div');
    timelinePanel.className = 'comparison-timeline-panel';

    // Create hour cells
    row.hours.forEach((hour, index) => {
      const hourCell = document.createElement('div');
      hourCell.className = 'comparison-hour';

      // Use consistent format based on setting
      hourCell.textContent = timeFormat === '12h' ? hour.time12 : hour.time24;

      // Mark current hour (index 24)
      if (index === 24) {
        hourCell.classList.add('current-hour');
      }

      // Mark working hours
      if (row.workingHours.includes(index)) {
        hourCell.classList.add('working-hour');
      }

      // Mark business overlap
      if (row.businessOverlap.includes(index)) {
        hourCell.classList.add('business-overlap');
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

      timelinePanel.appendChild(hourCell);
    });

    comparisonRow.appendChild(timelinePanel);
    comparisonGrid.appendChild(comparisonRow);
  });

  container.appendChild(comparisonGrid);
}

/**
 * Get human-readable time difference text
 * @param hourDifference Hour difference from user timezone
 * @returns Formatted time difference string
 */
function getTimeDifferenceText(hourDifference: number): string {
  if (hourDifference === 0) {
    return '🏠 Your timezone';
  }

  const absHours = Math.abs(hourDifference);
  const direction = hourDifference > 0 ? 'ahead' : 'behind';

  if (absHours === Math.floor(absHours)) {
    // Even hour difference
    const hourText = absHours === 1 ? 'hour' : 'hours';
    return `⏰ ${absHours} ${hourText} ${direction}`;
  } else {
    // Fractional hour difference
    const hours = Math.floor(absHours);
    const minutes = Math.round((absHours - hours) * 60);
    const hourText = hours === 1 ? 'hour' : 'hours';
    const minuteText = minutes === 1 ? 'minute' : 'minutes';

    if (hours === 0) {
      return `⏰ ${minutes} ${minuteText} ${direction}`;
    } else {
      return `⏰ ${hours} ${hourText} ${minutes} ${minuteText} ${direction}`;
    }
  }
}

/**
 * Format non-even offset for display
 * @param fraction Fractional part of offset
 * @returns Formatted offset string
 */
function formatNonEvenOffset(fraction: number): string {
  const minutes = Math.round(fraction * 60);
  return `+${minutes}min`;
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
