import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const packageJsonPath = join(process.cwd(), 'package.json');
const distIndexPath = join(process.cwd(), 'dist', 'index.html');

describe('Version Management', () => {
  describe('version injection into HTML', () => {
    it('should inject version into built HTML during build process', () => {
      // Run a build to ensure the HTML is generated with version
      execSync('npm run build', { cwd: process.cwd(), stdio: 'pipe' });
      
      // Check that the built HTML exists and contains version
      expect(existsSync(distIndexPath)).toBe(true);
      
      const htmlContent = readFileSync(distIndexPath, 'utf-8');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      
      // Should have version in meta tag
      expect(htmlContent).toContain(`<meta name="app-version" content="${packageJson.version}"`);
      
      // Should have version in footer
      expect(htmlContent).toContain(`<span class="version">v${packageJson.version}</span>`);
    });

    it('should use the version from package.json', () => {
      // Verify the version is what we expect it to be
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.version).toBe('0.0.1-alpha');
    });
  });
});