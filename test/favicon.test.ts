import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Favicon Implementation', () => {
  const distDir = 'dist';
  
  beforeAll(async () => {
    // Ensure dist directory exists and is built
    if (!existsSync(distDir)) {
      throw new Error('dist directory not found - run npm run build first');
    }
  });

  describe('favicon files exist', () => {
    const requiredFiles = [
      'favicon.svg',
      'favicon.ico', 
      'favicon-16x16.png',
      'favicon-32x32.png',
      'apple-touch-icon.png',
      'android-chrome-192x192.png',
      'android-chrome-512x512.png',
      'site.webmanifest'
    ];

    requiredFiles.forEach(file => {
      it(`should have ${file}`, () => {
        const filePath = join(distDir, file);
        expect(existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('HTML includes favicon links', () => {
    let htmlContent: string;

    beforeAll(() => {
      htmlContent = readFileSync(join(distDir, 'index.html'), 'utf-8');
    });

    it('should include SVG favicon link', () => {
      expect(htmlContent).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml"');
    });

    it('should include ICO favicon link', () => {
      expect(htmlContent).toContain('<link rel="icon" href="/favicon.ico" type="image/x-icon"');
    });

    it('should include 16x16 PNG favicon link', () => {
      expect(htmlContent).toContain('<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"');
    });

    it('should include 32x32 PNG favicon link', () => {
      expect(htmlContent).toContain('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"');
    });

    it('should include apple-touch-icon link', () => {
      expect(htmlContent).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"');
    });

    it('should include webmanifest link', () => {
      expect(htmlContent).toContain('<link rel="manifest" href="/site.webmanifest"');
    });

    it('should include theme-color meta tag', () => {
      expect(htmlContent).toContain('<meta name="theme-color" content="#4a90e2"');
    });
  });

  describe('SVG favicon content', () => {
    let svgContent: string;

    beforeAll(() => {
      svgContent = readFileSync(join(distDir, 'favicon.svg'), 'utf-8');
    });

    it('should be valid SVG with proper namespace', () => {
      expect(svgContent).toContain('<svg');
      expect(svgContent).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it('should contain globe elements', () => {
      expect(svgContent).toContain('<circle'); // Globe outline
    });

    it('should contain timezone lines', () => {
      expect(svgContent).toContain('<line'); // Meridian lines
    });

    it('should contain timezone text', () => {
      expect(svgContent).toContain('EST');
      expect(svgContent).toContain('GMT');
      expect(svgContent).toContain('JST');
    });

    it('should contain timezone offsets', () => {
      expect(svgContent).toContain('-5');
      expect(svgContent).toContain('+0');
      expect(svgContent).toContain('+9');
    });

    it('should contain time displays', () => {
      expect(svgContent).toContain('12:00');
      expect(svgContent).toContain('17:00');
      expect(svgContent).toContain('02:00');
    });
  });

  describe('webmanifest content', () => {
    let manifestContent: any;

    beforeAll(() => {
      const manifestText = readFileSync(join(distDir, 'site.webmanifest'), 'utf-8');
      manifestContent = JSON.parse(manifestText);
    });

    it('should have correct name and short_name', () => {
      expect(manifestContent.name).toBe('Every Time Zone');
      expect(manifestContent.short_name).toBe('EveryTimeZone');
    });

    it('should have proper theme colors', () => {
      expect(manifestContent.theme_color).toBe('#4a90e2');
      expect(manifestContent.background_color).toBe('#1a1a1a');
    });

    it('should include required icon sizes', () => {
      expect(manifestContent.icons).toContainEqual({
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      });
      expect(manifestContent.icons).toContainEqual({
        src: '/android-chrome-512x512.png', 
        sizes: '512x512',
        type: 'image/png'
      });
      expect(manifestContent.icons).toContainEqual({
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml'
      });
    });
  });

  describe('performance requirements', () => {
    it('should meet file size requirements (under 10KB for core favicon files)', () => {
      // Only core favicon files count toward 10KB limit (PNG files are exempt)
      const coreFiles = [
        'favicon.svg',
        'favicon.ico',
        'site.webmanifest'
      ];

      let totalSize = 0;
      coreFiles.forEach(file => {
        const filePath = join(distDir, file);
        if (existsSync(filePath)) {
          const stats = readFileSync(filePath);
          totalSize += stats.length;
        }
      });

      expect(totalSize).toBeLessThan(10 * 1024); // 10KB for core files only
    });

    it('should have all PNG favicon files present (no size limits)', () => {
      // PNG files don't count toward 10KB limit but should exist
      const pngFiles = [
        'favicon-16x16.png', 
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'android-chrome-192x192.png',
        'android-chrome-512x512.png'
      ];

      pngFiles.forEach(file => {
        const filePath = join(distDir, file);
        expect(existsSync(filePath)).toBe(true);
      });
    });

    it('should have SVG favicon under 3KB for fast loading', () => {
      const svgPath = join(distDir, 'favicon.svg');
      const svgContent = readFileSync(svgPath);
      expect(svgContent.length).toBeLessThan(3 * 1024); // 3KB
    });
  });
});