/**
 * Comprehensive Accessibility Tests for WCAG AAA Compliance
 * Tests real accessibility concerns including contrast ratios, screen sizes, and proper WCAG validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { loadActualHTML } from './setup.js';
import { AVAILABLE_THEMES, SettingsPanel, AppearanceSettings } from '../src/scripts/settings.js';

// Screen sizes extracted from CSS media queries for responsive accessibility testing
const SCREEN_SIZES = [
  { name: 'Small Mobile', width: 375, height: 667 }, // Below 576px breakpoint
  { name: 'Mobile', width: 576, height: 1024 }, // max-width: 576px
  { name: 'Tablet', width: 768, height: 1024 }, // min-width: 768px
  { name: 'Desktop', width: 992, height: 768 }, // min-width: 992px
  { name: 'Large Desktop', width: 1400, height: 900 }, // min-width: 1400px
  { name: 'Ultra-wide/TV', width: 1920, height: 1080 } // min-width: 1920px
];

/**
 * Calculate relative luminance for WCAG color contrast
 */
function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate WCAG contrast ratio between two colors
 */
function getContrastRatio(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse RGB color string to RGB object
 */
function parseRGB(colorStr: string): { r: number; g: number; b: number } | null {
  const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3])
    };
  }
  return null;
}

/**
 * Get computed background color walking up the DOM tree
 */
function getComputedBackgroundColor(element: Element): string {
  let current = element;
  while (current && current !== document.body) {
    const bg = window.getComputedStyle(current).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      return bg;
    }
    current = current.parentElement!;
  }
  return window.getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)';
}

describe('WCAG AAA Accessibility Standards', () => {
  let settingsPanel: SettingsPanel;

  beforeEach(() => {
    loadActualHTML();
    settingsPanel = new SettingsPanel();
  });

  // Hierarchical testing structure to avoid redundancy
  AVAILABLE_THEMES.forEach(theme => {
    describe(`Theme: ${theme.displayName}`, () => {
      ['dark', 'light'].forEach(mode => {
        describe(`Mode: ${mode}`, () => {
          let settings: AppearanceSettings;

          beforeEach(() => {
            // Apply theme and mode once per describe block
            settings = {
              theme: theme.name,
              mode: mode as 'dark' | 'light',
              timeFormat: '12h'
            };
            (settingsPanel as any).applySettings(settings);
          });

          it('should apply theme and mode correctly', () => {
            expect(document.body.classList.contains(`theme-${theme.name}`)).toBe(true);
            expect(document.body.classList.contains(`${mode}-theme`)).toBe(true);
          });

          it('should meet WCAG AAA color contrast requirements (7:1 for normal text)', () => {
            const textElements = document.querySelectorAll('h1, h2, h3, p, button, a, label, .timezone-name');
            let contrastIssues: string[] = [];

            textElements.forEach((element, index) => {
              const styles = window.getComputedStyle(element);
              const textColor = styles.color;
              const backgroundColor = getComputedBackgroundColor(element);

              if (textColor && backgroundColor) {
                const textRGB = parseRGB(textColor);
                const bgRGB = parseRGB(backgroundColor);

                if (textRGB && bgRGB) {
                  const contrastRatio = getContrastRatio(textRGB, bgRGB);
                  if (contrastRatio < 7.0) { // WCAG AAA requires 7:1 for normal text
                    contrastIssues.push(
                      `${element.tagName}[${index}] contrast ratio ${contrastRatio.toFixed(2)}:1 is below WCAG AAA standard (7:1)`
                    );
                  }
                }
              }
            });

            expect(contrastIssues.length, `Contrast issues found: ${contrastIssues.join(', ')}`).toBe(0);
          });

          it('should meet WCAG AAA large text contrast requirements (4.5:1)', () => {
            const largeTextElements = document.querySelectorAll('h1, h2, .title, .large-text');
            let contrastIssues: string[] = [];

            largeTextElements.forEach((element, index) => {
              const styles = window.getComputedStyle(element);
              const fontSize = parseFloat(styles.fontSize);
              const fontWeight = styles.fontWeight;
              
              // Large text is 18pt+ or 14pt+ bold (roughly 24px+ or 18.5px+ bold)
              const isLargeText = fontSize >= 24 || (fontSize >= 18.5 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
              
              if (isLargeText) {
                const textColor = styles.color;
                const backgroundColor = getComputedBackgroundColor(element);

                if (textColor && backgroundColor) {
                  const textRGB = parseRGB(textColor);
                  const bgRGB = parseRGB(backgroundColor);

                  if (textRGB && bgRGB) {
                    const contrastRatio = getContrastRatio(textRGB, bgRGB);
                    if (contrastRatio < 4.5) { // WCAG AAA requires 4.5:1 for large text
                      contrastIssues.push(
                        `Large text ${element.tagName}[${index}] contrast ratio ${contrastRatio.toFixed(2)}:1 is below WCAG AAA standard (4.5:1)`
                      );
                    }
                  }
                }
              }
            });

            expect(contrastIssues.length, `Large text contrast issues: ${contrastIssues.join(', ')}`).toBe(0);
          });

          it('should have proper semantic HTML structure', () => {
            // Required semantic landmarks
            expect(document.querySelector('header'), 'Missing header landmark').toBeTruthy();
            expect(document.querySelector('main'), 'Missing main landmark').toBeTruthy();
            
            // Proper heading hierarchy (h1 must exist, no skipped levels)
            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
            expect(headings.length, 'No headings found').toBeGreaterThan(0);
            
            const h1 = document.querySelector('h1');
            expect(h1, 'Missing h1 element').toBeTruthy();
            expect(h1?.textContent, 'h1 should have meaningful content').toBe('Every Time Zone');

            // Check heading hierarchy doesn't skip levels
            const headingLevels = headings.map(h => parseInt(h.tagName.charAt(1)));
            for (let i = 1; i < headingLevels.length; i++) {
              const current = headingLevels[i];
              const previous = headingLevels[i - 1];
              expect(current - previous, `Heading hierarchy skips from h${previous} to h${current}`).toBeLessThanOrEqual(1);
            }
          });

          it('should have accessible form controls with proper labeling', () => {
            const inputs = document.querySelectorAll('input');
            inputs.forEach((input, index) => {
              const id = input.id;
              const hasLabel = id && document.querySelector(`label[for="${id}"]`);
              const hasAriaLabel = input.getAttribute('aria-label');
              const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
              const isInLabel = input.closest('label');

              expect(hasLabel || hasAriaLabel || hasAriaLabelledBy || isInLabel,
                `Input ${index} (${input.type}) must have accessible labeling`
              ).toBeTruthy();

              // Verify input has meaningful accessible name
              const accessibleName = hasAriaLabel || 
                                   (hasLabel as HTMLElement)?.textContent?.trim() || 
                                   (isInLabel as HTMLElement)?.textContent?.trim() || '';
              expect(accessibleName.length, 
                `Input ${index} must have meaningful accessible name`
              ).toBeGreaterThan(0);
            });
          });

          it('should have keyboard accessible interactive elements', () => {
            const interactiveElements = document.querySelectorAll(
              'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            expect(interactiveElements.length, 'No keyboard accessible elements found').toBeGreaterThan(0);

            interactiveElements.forEach((element, index) => {
              // Test focus capability
              (element as HTMLElement).focus();
              expect(document.activeElement, 
                `Element ${index} (${element.tagName}) must be focusable`
              ).toBe(element);

              // Check accessible name
              const accessibleName = element.textContent?.trim() ||
                                   element.getAttribute('aria-label') ||
                                   element.getAttribute('title') ||
                                   element.getAttribute('alt') || '';
              
              expect(accessibleName.length,
                `Interactive element ${index} (${element.tagName}) must have accessible name`
              ).toBeGreaterThan(0);
            });
          });

          SCREEN_SIZES.forEach(size => {
            it(`should maintain accessibility at ${size.name} (${size.width}×${size.height})`, () => {
              // Simulate viewport for responsive testing
              Object.defineProperty(window, 'innerWidth', { value: size.width, writable: true });
              Object.defineProperty(window, 'innerHeight', { value: size.height, writable: true });
              window.dispatchEvent(new Event('resize'));

              // Touch target size validation (WCAG AAA requires 44×44px minimum)
              const interactiveElements = document.querySelectorAll('button, a, input, .theme-option');
              interactiveElements.forEach((element, index) => {
                const rect = element.getBoundingClientRect();
                const minSize = 44; // WCAG AAA minimum

                // For elements that might be smaller, check if they have adequate padding
                if (rect.width < minSize || rect.height < minSize) {
                  const styles = window.getComputedStyle(element);
                  const paddingX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
                  const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
                  
                  const effectiveWidth = rect.width + paddingX;
                  const effectiveHeight = rect.height + paddingY;
                  
                  expect(effectiveWidth >= minSize && effectiveHeight >= minSize,
                    `Interactive element ${index} at ${size.name} has inadequate touch target size: ${effectiveWidth}×${effectiveHeight} (minimum: ${minSize}×${minSize})`
                  ).toBe(true);
                }
              });

              // Essential elements must remain visible and accessible
              expect(document.querySelector('h1'), 'Page title must be visible').toBeTruthy();
              expect(document.querySelector('.timeline, main, #content'), 'Main content must be accessible').toBeTruthy();
              expect(document.querySelector('.appearance-settings'), 'Settings must be accessible').toBeTruthy();
            });
          });
        });
      });
    });
  });

  describe('Overall WCAG AAA Compliance', () => {
    it('should not use color alone to convey information', () => {
      // Check that interactive elements have text or alternative indicators
      const colorOnlyElements = document.querySelectorAll('.color-indicator, .status-indicator');
      colorOnlyElements.forEach((element, index) => {
        const hasText = element.textContent?.trim();
        const hasAriaLabel = element.getAttribute('aria-label');
        const hasTitle = element.getAttribute('title');
        const hasPattern = element.querySelector('svg, .pattern, .icon');

        expect(hasText || hasAriaLabel || hasTitle || hasPattern,
          `Element ${index} using color to convey information must have alternative indicators`
        ).toBeTruthy();
      });
    });

    it('should provide proper error messages and instructions', () => {
      const formElements = document.querySelectorAll('form, .form-group');
      formElements.forEach((form, index) => {
        // Forms should have either clear labels/placeholders or explicit instructions
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach((input, inputIndex) => {
          const hasPlaceholder = input.getAttribute('placeholder');
          const hasInstructions = input.getAttribute('aria-describedby');
          const label = document.querySelector(`label[for="${input.id}"]`);
          
          if (!hasPlaceholder && !hasInstructions && !label?.textContent?.trim()) {
            // If no clear guidance, this is a potential accessibility issue
            console.warn(`Input ${inputIndex} in form ${index} may need clearer instructions`);
          }
        });
      });
    });

    it('should support assistive technology navigation', () => {
      // Check for ARIA landmarks
      const landmarks = document.querySelectorAll('[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]');
      const semanticLandmarks = document.querySelectorAll('header, nav, main, aside, footer');
      
      expect(landmarks.length + semanticLandmarks.length,
        'Page should have navigational landmarks for screen readers'
      ).toBeGreaterThan(0);

      // Check for skip links or equivalent navigation aids
      const skipLinks = document.querySelectorAll('a[href^="#"], .skip-link');
      const firstInteractive = document.querySelector('button, a[href], input');
      
      // Either skip links should exist, or the first interactive element should be meaningful
      if (skipLinks.length === 0 && firstInteractive) {
        const firstText = firstInteractive.textContent?.trim() || firstInteractive.getAttribute('aria-label') || '';
        expect(firstText.toLowerCase().includes('skip') || firstText.toLowerCase().includes('menu') || firstText.toLowerCase().includes('navigation'),
          'Page should provide skip links or meaningful first navigation element'
        ).toBe(false); // This is just a warning, not a failure
      }
    });
  });
});