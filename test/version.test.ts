import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const packageJsonPath = join(process.cwd(), 'package.json');
const distIndexPath = join(process.cwd(), 'dist', 'index.html');

describe('Version Management', () => {
  let originalGitVersionSemVer: string | undefined;
  
  beforeAll(() => {
    // Store original environment variable
    originalGitVersionSemVer = process.env.GITVERSION_SEMVER;
    
    // Set up mock GitVersion environment variable for testing
    if (!process.env.GITVERSION_SEMVER) {
      process.env.GITVERSION_SEMVER = '1.0.2-test';
    }
  });
  
  afterAll(() => {
    // Restore original environment variable
    if (originalGitVersionSemVer !== undefined) {
      process.env.GITVERSION_SEMVER = originalGitVersionSemVer;
    } else {
      delete process.env.GITVERSION_SEMVER;
    }
  });

  describe('GitVersion requirement', () => {
    it('should use GitVersion from environment variables when available', () => {
      // Ensure GitVersion environment variable is available
      expect(process.env.GITVERSION_SEMVER).toBeDefined();
      
      // Run version injection step directly with GitVersion environment variable
      execSync('npm run version:inject', { 
        cwd: process.cwd(), 
        stdio: 'pipe',
        env: { ...process.env, GITVERSION_SEMVER: process.env.GITVERSION_SEMVER }
      });
      
      // Check that the built HTML exists and contains version from GitVersion
      expect(existsSync(distIndexPath)).toBe(true);
      
      const htmlContent = readFileSync(distIndexPath, 'utf-8');
      const expectedVersion = process.env.GITVERSION_SEMVER!;
      
      // Should have version in meta tag
      expect(htmlContent).toContain(`<meta name="app-version" content="${expectedVersion}"`);
      
      // Should have version in footer
      expect(htmlContent).toContain(`<span class="version">v${expectedVersion}</span>`);
    });

    it('should keep package.json version static in source control', () => {
      // Verify the package.json version remains static as requested
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.version).toBe('1.0.0');
    });
    
    it('should generate version from GitVersion that follows semantic versioning', () => {
      // The injected version should follow semantic versioning pattern
      const gitVersion = process.env.GITVERSION_SEMVER || '1.0.2-test';
      
      // GitVersion SemVer follows standard semantic versioning without build metadata
      expect(gitVersion).toMatch(/^\d+\.\d+\.\d+(?:-\w+(?:\.\w+)?)?$/);
    });
  });
});