/**
 * Sliding Scale Mode - Option 5
 *
 * This module provides a horizontal sliding scale interface
 * with proportional spacing that shows precise timezone
 * relationships and allows for fine-grained time exploration.
 */

import { TimeZone, TimelineHour, generateTimelineHours, getUserTimezone } from './index.js';
import { SettingsPanel } from './settings.js';

/**
 * Scale position data for sliding scale layout
 */
export interface ScalePosition {
  timezone: TimeZone;
  hours: TimelineHour[];
  position: number; // Pixel position on the scale
  isUserTimezone: boolean;
  hasNonEvenOffset: boolean;
  offsetFraction: number;
  relativeOffset: number; // Offset relative to the earliest timezone
}

/**
 * Create sliding scale position data
 * @param numHours Number of hours to display
 * @param timezones Array of timezones to display
 * @param baseDate Base date for calculations
 * @returns Array of scale positions
 */
export function createSlidingScaleData(numHours: number, timezones: TimeZone[], baseDate?: Date): ScalePosition[] {
  const userTz = getUserTimezone();

  // Find the minimum offset to use as baseline
  const minOffset = Math.min(...timezones.map(tz => tz.offset));

  // Scale factor: pixels per hour (make it generous for readability)
  const pixelsPerHour = 80;

  return timezones.map(timezone => {
    const hours = generateTimelineHours(numHours, timezone, baseDate);
    const relativeOffset = timezone.offset - minOffset;
    const position = relativeOffset * pixelsPerHour;

    const offsetFraction = Math.abs(timezone.offset - Math.floor(timezone.offset));
    const hasNonEvenOffset = offsetFraction > 0;
    const isUserTimezone = timezone.iana === userTz.iana;

    return {
      timezone,
      hours,
      position,
      isUserTimezone,
      hasNonEvenOffset,
      offsetFraction,
      relativeOffset,
    };
  });
}

/**
 * Render sliding scale timeline visualization
 * @param container Timeline container element
 * @param scaleData Sliding scale position data
 */
export function renderSlidingScale(container: HTMLElement, scaleData: ScalePosition[]): void {
  // Clear container
  container.innerHTML = '';

  // Add sliding scale class for CSS targeting
  container.classList.add('sliding-scale');

  // Get current time format setting
  const settings = SettingsPanel.getCurrentSettings();
  const timeFormat = settings?.timeFormat || '12h';

  // Create header
  const headerSection = document.createElement('div');
  headerSection.className = 'scale-header';
  headerSection.innerHTML = `
    <div class="scale-info">
      <h3>📏 Sliding Scale View</h3>
      <p>Timezones positioned proportionally by UTC offset with precise spacing</p>
      <div class="scale-legend">
        <span class="legend-item"><span class="user-scale-indicator"></span> Your Timezone</span>
        <span class="legend-item"><span class="fractional-scale-indicator"></span> Non-even Offsets</span>
        <span class="legend-item">Scroll horizontally to explore the full timeline</span>
      </div>
    </div>
  `;
  container.appendChild(headerSection);

  // Calculate total width needed
  const maxPosition = Math.max(...scaleData.map(pos => pos.position));
  const totalWidth = maxPosition + 400; // Extra padding

  // Create scale container
  const scaleContainer = document.createElement('div');
  scaleContainer.className = 'scale-container';
  scaleContainer.style.width = `${totalWidth}px`;

  // Create hour scale ruler
  const ruler = document.createElement('div');
  ruler.className = 'scale-ruler';
  ruler.style.width = `${totalWidth}px`;

  // Add hour markers every hour
  const minOffset = Math.min(...scaleData.map(pos => pos.timezone.offset));
  const maxOffset = Math.max(...scaleData.map(pos => pos.timezone.offset));

  for (let offset = Math.floor(minOffset); offset <= Math.ceil(maxOffset); offset++) {
    const position = (offset - minOffset) * 80;

    const marker = document.createElement('div');
    marker.className = 'hour-marker';
    marker.style.left = `${position}px`;

    const markerLine = document.createElement('div');
    markerLine.className = 'marker-line';
    marker.appendChild(markerLine);

    const markerLabel = document.createElement('div');
    markerLabel.className = 'marker-label';
    markerLabel.textContent = `UTC${formatOffset(offset)}`;
    marker.appendChild(markerLabel);

    ruler.appendChild(marker);
  }

  // Add half-hour markers for better granularity
  for (let offset = Math.floor(minOffset * 2) / 2; offset <= Math.ceil(maxOffset * 2) / 2; offset += 0.5) {
    if (offset === Math.floor(offset)) continue; // Skip full hours (already added)

    const position = (offset - minOffset) * 80;

    const halfMarker = document.createElement('div');
    halfMarker.className = 'half-hour-marker';
    halfMarker.style.left = `${position}px`;

    const halfMarkerLine = document.createElement('div');
    halfMarkerLine.className = 'half-marker-line';
    halfMarker.appendChild(halfMarkerLine);

    ruler.appendChild(halfMarker);
  }

  scaleContainer.appendChild(ruler);

  // Create timezone tracks
  const tracksContainer = document.createElement('div');
  tracksContainer.className = 'scale-tracks';

  // Sort by position for consistent ordering
  const sortedData = [...scaleData].sort((a, b) => a.position - b.position);

  sortedData.forEach(scalePos => {
    const track = document.createElement('div');
    track.className = 'scale-track';

    if (scalePos.isUserTimezone) {
      track.classList.add('user-timezone');
    }

    if (scalePos.hasNonEvenOffset) {
      track.classList.add('non-even-offset');
    }

    // Timezone info panel (fixed position)
    const infoPanel = document.createElement('div');
    infoPanel.className = 'track-info';
    infoPanel.style.left = `${scalePos.position}px`;

    infoPanel.innerHTML = `
      <div class="track-timezone-name">${scalePos.timezone.cityName}</div>
      <div class="track-timezone-details">
        ${scalePos.timezone.displayName}
        <br>${formatOffset(scalePos.timezone.offset)}
        ${scalePos.hasNonEvenOffset ? `<span class="fractional-badge">⏰ +${Math.round(scalePos.offsetFraction * 60)}min</span>` : ''}
      </div>
    `;

    track.appendChild(infoPanel);

    // Timeline strip with hours
    const timelineStrip = document.createElement('div');
    timelineStrip.className = 'timeline-strip';
    timelineStrip.style.left = `${scalePos.position - 400}px`; // Offset to show hours before and after
    timelineStrip.style.width = '800px';

    // Add hours to the strip
    scalePos.hours.forEach((hour, index) => {
      const hourElement = document.createElement('div');
      hourElement.className = 'scale-hour';

      // Position based on hour index (each hour is ~16.67px wide in an 800px strip for 48 hours)
      hourElement.style.left = `${(index / 48) * 800}px`;

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

      timelineStrip.appendChild(hourElement);
    });

    track.appendChild(timelineStrip);
    tracksContainer.appendChild(track);
  });

  scaleContainer.appendChild(tracksContainer);

  // Create scrollable wrapper
  const scrollWrapper = document.createElement('div');
  scrollWrapper.className = 'scale-scroll-wrapper';
  scrollWrapper.appendChild(scaleContainer);

  container.appendChild(scrollWrapper);

  // Add interaction controls
  const controlsSection = document.createElement('div');
  controlsSection.className = 'scale-controls';

  // Find user timezone position for scrolling
  const userPosition = scaleData.find(pos => pos.isUserTimezone)?.position || 0;

  controlsSection.innerHTML = `
    <div class="scale-control-buttons">
      <button class="scale-control-btn" id="scroll-to-user">🏠 Go to Your Timezone</button>
      <button class="scale-control-btn" id="scroll-to-start">⏮️ Go to Earliest</button>
      <button class="scale-control-btn" id="scroll-to-end">⏭️ Go to Latest</button>
    </div>
    <div class="scale-tips">
      <p><strong>Navigation Tips:</strong></p>
      <ul>
        <li>Scroll horizontally to explore different timezone relationships</li>
        <li>Each timezone is positioned exactly by its UTC offset</li>
        <li>Fractional offsets (like +5:30) show precise positioning</li>
        <li>Working hours (9 AM - 5 PM) are highlighted for easy comparison</li>
      </ul>
    </div>
  `;

  container.appendChild(controlsSection);

  // Add scroll functionality
  const scrollToUserBtn = controlsSection.querySelector('#scroll-to-user') as HTMLButtonElement;
  const scrollToStartBtn = controlsSection.querySelector('#scroll-to-start') as HTMLButtonElement;
  const scrollToEndBtn = controlsSection.querySelector('#scroll-to-end') as HTMLButtonElement;

  if (scrollToUserBtn) {
    scrollToUserBtn.addEventListener('click', () => {
      scrollWrapper.scrollTo({
        left: Math.max(0, userPosition - scrollWrapper.clientWidth / 2),
        behavior: 'smooth',
      });
    });
  }

  if (scrollToStartBtn) {
    scrollToStartBtn.addEventListener('click', () => {
      scrollWrapper.scrollTo({ left: 0, behavior: 'smooth' });
    });
  }

  if (scrollToEndBtn) {
    scrollToEndBtn.addEventListener('click', () => {
      scrollWrapper.scrollTo({
        left: scrollWrapper.scrollWidth - scrollWrapper.clientWidth,
        behavior: 'smooth',
      });
    });
  }

  // Auto-scroll to user timezone initially
  setTimeout(() => {
    scrollWrapper.scrollTo({
      left: Math.max(0, userPosition - scrollWrapper.clientWidth / 2),
      behavior: 'smooth',
    });
  }, 100);
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
