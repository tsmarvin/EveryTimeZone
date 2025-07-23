/**
 * Circular Clock Mode - Option 4
 *
 * This module provides a circular clock-like interface showing
 * all timezones arranged in a clock formation with visual
 * indicators for time relationships and fractional offsets.
 */

import { TimeZone, TimelineHour, generateTimelineHours, getUserTimezone } from './index.js';
import { SettingsPanel } from './settings.js';

/**
 * Clock position data for circular layout
 */
export interface ClockPosition {
  timezone: TimeZone;
  currentHour: TimelineHour;
  angle: number; // Position angle on the clock (0-360 degrees)
  radius: number; // Distance from center (based on offset grouping)
  isUserTimezone: boolean;
  hasNonEvenOffset: boolean;
  offsetFraction: number;
}

/**
 * Create circular clock position data
 * @param timezones Array of timezones to display
 * @param baseDate Base date for calculations
 * @returns Array of clock positions
 */
export function createCircularClockData(timezones: TimeZone[], baseDate?: Date): ClockPosition[] {
  const userTz = getUserTimezone();

  return timezones.map(timezone => {
    const hours = generateTimelineHours(48, timezone, baseDate);
    const currentHour = hours[24]; // Current hour is at index 24

    if (!currentHour) {
      throw new Error(`Unable to generate current hour for timezone ${timezone.cityName}`);
    }

    // Calculate angle based on UTC offset
    // 360 degrees / 24 hours = 15 degrees per hour
    // Offset from 12 o'clock position (UTC+0 at top)
    const baseAngle = (timezone.offset * 15) % 360;
    const angle = baseAngle < 0 ? baseAngle + 360 : baseAngle;

    // Calculate radius based on whether it's user timezone or not
    const isUserTimezone = timezone.iana === userTz.iana;
    const radius = isUserTimezone ? 120 : 180; // User timezone closer to center

    const offsetFraction = Math.abs(timezone.offset - Math.floor(timezone.offset));
    const hasNonEvenOffset = offsetFraction > 0;

    return {
      timezone,
      currentHour,
      angle,
      radius,
      isUserTimezone,
      hasNonEvenOffset,
      offsetFraction,
    };
  });
}

/**
 * Render circular clock timeline visualization
 * @param container Timeline container element
 * @param clockData Circular clock position data
 */
export function renderCircularClock(container: HTMLElement, clockData: ClockPosition[]): void {
  // Clear container
  container.innerHTML = '';

  // Add circular clock class for CSS targeting
  container.classList.add('circular-clock');

  // Get current time format setting
  const settings = SettingsPanel.getCurrentSettings();
  const timeFormat = settings?.timeFormat || '12h';

  // Create header
  const headerSection = document.createElement('div');
  headerSection.className = 'clock-header';
  headerSection.innerHTML = `
    <div class="clock-info">
      <h3>🕐 Circular Clock View</h3>
      <p>Timezones arranged by UTC offset around a 24-hour clock</p>
      <div class="clock-legend">
        <span class="legend-item"><span class="user-tz-indicator"></span> Your Timezone (Inner Ring)</span>
        <span class="legend-item"><span class="other-tz-indicator"></span> Other Timezones (Outer Ring)</span>
        <span class="legend-item"><span class="fractional-indicator"></span> Non-even Offsets</span>
      </div>
    </div>
  `;
  container.appendChild(headerSection);

  // Create clock container
  const clockContainer = document.createElement('div');
  clockContainer.className = 'clock-container';

  // Create SVG for the clock
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 400 400');
  svg.setAttribute('width', '400');
  svg.setAttribute('height', '400');
  svg.setAttribute('class', 'clock-svg');

  // Add clock background circle
  const backgroundCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  backgroundCircle.setAttribute('cx', '200');
  backgroundCircle.setAttribute('cy', '200');
  backgroundCircle.setAttribute('r', '190');
  backgroundCircle.setAttribute('class', 'clock-background');
  svg.appendChild(backgroundCircle);

  // Add hour markers (12, 3, 6, 9)
  const hourPositions = [
    { hour: 0, angle: 0, label: '12 UTC' },
    { hour: 6, angle: 90, label: '6 UTC' },
    { hour: 12, angle: 180, label: '12 UTC' },
    { hour: 18, angle: 270, label: '18 UTC' },
  ];

  hourPositions.forEach(pos => {
    const radian = (pos.angle - 90) * (Math.PI / 180); // -90 to start from top
    const x = 200 + Math.cos(radian) * 170;
    const y = 200 + Math.sin(radian) * 170;

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x.toString());
    text.setAttribute('y', y.toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('class', 'clock-hour-marker');
    text.textContent = pos.label;
    svg.appendChild(text);

    // Add tick mark
    const tickX1 = 200 + Math.cos(radian) * 185;
    const tickY1 = 200 + Math.sin(radian) * 185;
    const tickX2 = 200 + Math.cos(radian) * 195;
    const tickY2 = 200 + Math.sin(radian) * 195;

    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tick.setAttribute('x1', tickX1.toString());
    tick.setAttribute('y1', tickY1.toString());
    tick.setAttribute('x2', tickX2.toString());
    tick.setAttribute('y2', tickY2.toString());
    tick.setAttribute('class', 'clock-tick');
    svg.appendChild(tick);
  });

  // Add center point
  const centerPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  centerPoint.setAttribute('cx', '200');
  centerPoint.setAttribute('cy', '200');
  centerPoint.setAttribute('r', '8');
  centerPoint.setAttribute('class', 'clock-center');
  svg.appendChild(centerPoint);

  // Add timezone positions
  clockData.forEach(position => {
    const radian = (position.angle - 90) * (Math.PI / 180); // -90 to start from top
    const x = 200 + Math.cos(radian) * position.radius;
    const y = 200 + Math.sin(radian) * position.radius;

    // Create timezone group
    const tzGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    tzGroup.setAttribute('class', 'timezone-position');

    if (position.isUserTimezone) {
      tzGroup.classList.add('user-timezone');
    }

    if (position.hasNonEvenOffset) {
      tzGroup.classList.add('non-even-offset');
    }

    // Add connection line from center
    const connectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    connectionLine.setAttribute('x1', '200');
    connectionLine.setAttribute('y1', '200');
    connectionLine.setAttribute('x2', x.toString());
    connectionLine.setAttribute('y2', y.toString());
    connectionLine.setAttribute('class', 'connection-line');
    tzGroup.appendChild(connectionLine);

    // Add timezone circle
    const tzCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    tzCircle.setAttribute('cx', x.toString());
    tzCircle.setAttribute('cy', y.toString());
    tzCircle.setAttribute('r', position.isUserTimezone ? '12' : '8');
    tzCircle.setAttribute('class', 'timezone-circle');

    // Add special styling for fractional offsets
    if (position.hasNonEvenOffset) {
      tzCircle.setAttribute('class', 'timezone-circle fractional-offset');
    }

    tzGroup.appendChild(tzCircle);

    // Add current time text
    const timeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    timeText.setAttribute('x', x.toString());
    timeText.setAttribute('y', (y - 20).toString());
    timeText.setAttribute('text-anchor', 'middle');
    timeText.setAttribute('class', 'timezone-time');
    timeText.textContent = timeFormat === '12h' ? position.currentHour.time12 : position.currentHour.time24;
    tzGroup.appendChild(timeText);

    // Add timezone name
    const cityText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    cityText.setAttribute('x', x.toString());
    cityText.setAttribute('y', (y + 25).toString());
    cityText.setAttribute('text-anchor', 'middle');
    cityText.setAttribute('class', 'timezone-city');
    cityText.textContent = position.timezone.cityName;
    tzGroup.appendChild(cityText);

    // Add fractional offset indicator if needed
    if (position.hasNonEvenOffset) {
      const offsetText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      offsetText.setAttribute('x', x.toString());
      offsetText.setAttribute('y', (y + 35).toString());
      offsetText.setAttribute('text-anchor', 'middle');
      offsetText.setAttribute('class', 'fractional-offset-text');
      offsetText.textContent = `⏰ +${Math.round(position.offsetFraction * 60)}min`;
      tzGroup.appendChild(offsetText);
    }

    // Add tooltip on hover
    const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    titleElement.textContent = `${position.timezone.cityName}: ${position.timezone.displayName} (${formatOffset(position.timezone.offset)})`;
    tzGroup.appendChild(titleElement);

    svg.appendChild(tzGroup);
  });

  clockContainer.appendChild(svg);
  container.appendChild(clockContainer);

  // Add interaction info
  const interactionInfo = document.createElement('div');
  interactionInfo.className = 'clock-interaction-info';
  interactionInfo.innerHTML = `
    <div class="interaction-tips">
      <p><strong>How to read:</strong></p>
      <ul>
        <li>Your timezone appears on the inner ring (closer to center)</li>
        <li>Other timezones on the outer ring, positioned by UTC offset</li>
        <li>12 UTC is at the top, offsets proceed clockwise</li>
        <li>Non-even offsets (like +5:30) are marked with ⏰</li>
        <li>Hover over any timezone for detailed information</li>
      </ul>
    </div>
  `;
  container.appendChild(interactionInfo);
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
