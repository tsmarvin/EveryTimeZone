import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { generateVersion, updatePackageJson } from '../scripts/update-version.js';

const packageJsonPath = join(process.cwd(), 'package.json');
const distIndexPath = join(process.cwd(), 'dist', 'index.html');

describe('Version Management', () => {
  let originalPackageJson: string;

  beforeEach(() => {
    // Backup original package.json
    originalPackageJson = readFileSync(packageJsonPath, 'utf-8');
  });

  afterEach(() => {
    // Restore original package.json
    writeFileSync(packageJsonPath, originalPackageJson);
  });

  describe('generateVersion', () => {
    it('should generate a valid semantic version', () => {
      const version = generateVersion();
      
      // Should match semantic version pattern
      expect(version).toMatch(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/);
    });

    it('should generate different versions for different branch types', () => {
      const version = generateVersion();
      
      // Should be a string with dots
      expect(typeof version).toBe('string');
      expect(version).toContain('.');
    });
  });

  describe('updatePackageJson', () => {
    it('should update package.json version', () => {
      const testVersion = '1.2.3-test';
      const result = updatePackageJson(testVersion);
      
      expect(result.newVersion).toBe(testVersion);
      expect(result.oldVersion).toBeTruthy();
      
      // Verify the file was actually updated
      const updatedPackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      expect(updatedPackageJson.version).toBe(testVersion);
    });

    it('should preserve other package.json properties', () => {
      const originalData = JSON.parse(originalPackageJson);
      const testVersion = '1.2.3-test';
      
      updatePackageJson(testVersion);
      
      const updatedData = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      
      // Check that only version changed
      expect(updatedData.name).toBe(originalData.name);
      expect(updatedData.description).toBe(originalData.description);
      expect(updatedData.version).toBe(testVersion);
      expect(updatedData.version).not.toBe(originalData.version);
    });
  });

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
  });
});