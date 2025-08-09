import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Deploy Version Behavior', () => {
  it('should use different versions for main and develop builds', () => {
    // This test validates that when GitVersion env vars are not set,
    // the inject-version script falls back to git-based version calculation
    // which will produce different versions for different branches
    
    // Store original values
    const originalSemVer = process.env.GITVERSION_SEMVER;
    const originalFullSemVer = process.env.GITVERSION_FULLSEMVER;
    const originalInformationalVersion = process.env.GITVERSION_INFORMATIONALVERSION;
    
    try {
      // Clear GitVersion environment variables to simulate main branch build
      delete process.env.GITVERSION_SEMVER;
      delete process.env.GITVERSION_FULLSEMVER;
      delete process.env.GITVERSION_INFORMATIONALVERSION;
      
      // Build without GitVersion env vars (simulating main branch build scenario)
      execSync('npm run build', { cwd: process.cwd(), stdio: 'pipe' });
      
      // Check that version was injected
      const distIndexPath = join(process.cwd(), 'dist', 'index.html');
      expect(existsSync(distIndexPath)).toBe(true);
      
      const htmlContent = readFileSync(distIndexPath, 'utf-8');
      
      // Should have version meta tag
      expect(htmlContent).toMatch(/<meta name="app-version" content="[^"]+"/);
      
      // Should have version in footer
      expect(htmlContent).toMatch(/<span class="version">v[^<]+<\/span>/);
      
      // Extract the version from the footer
      const versionMatch = htmlContent.match(/<span class="version">v([^<]+)<\/span>/);
      expect(versionMatch).toBeTruthy();
      
      const injectedVersion = versionMatch![1];
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: process.cwd() }).trim();
      
      console.log(`Injected version: ${injectedVersion}`);
      console.log(`Current branch: ${currentBranch}`);
      
      // Should be a valid semver-like version
      expect(injectedVersion).toMatch(/^\d+\.\d+\.\d+/);
      
      // Since we're not on main branch and have no GitVersion env vars,
      // it should use git fallback which produces alpha versions for non-main branches
      if (currentBranch !== 'main') {
        expect(injectedVersion).toMatch(/alpha/);
      }
      
    } finally {
      // Restore environment variables
      if (originalSemVer !== undefined) {
        process.env.GITVERSION_SEMVER = originalSemVer;
      } else {
        delete process.env.GITVERSION_SEMVER;
      }
      if (originalFullSemVer !== undefined) {
        process.env.GITVERSION_FULLSEMVER = originalFullSemVer;
      } else {
        delete process.env.GITVERSION_FULLSEMVER;
      }
      if (originalInformationalVersion !== undefined) {
        process.env.GITVERSION_INFORMATIONALVERSION = originalInformationalVersion;
      } else {
        delete process.env.GITVERSION_INFORMATIONALVERSION;
      }
    }
  });

  it('should use GitVersion env vars when available', () => {
    // Store original values
    const originalSemVer = process.env.GITVERSION_SEMVER;
    const originalFullSemVer = process.env.GITVERSION_FULLSEMVER;
    const originalInformationalVersion = process.env.GITVERSION_INFORMATIONALVERSION;
    
    try {
      // Set GitVersion environment variables (simulating develop branch build with CI)
      process.env.GITVERSION_SEMVER = '1.2.3-beta.4';
      process.env.GITVERSION_FULLSEMVER = '1.2.3-beta.4+5';
      process.env.GITVERSION_INFORMATIONALVERSION = '1.2.3-beta.4+Branch.develop.Sha.abcdef';
      
      // Build with GitVersion env vars
      execSync('npm run build', { cwd: process.cwd(), stdio: 'pipe' });
      
      // Check that the specific version was injected
      const distIndexPath = join(process.cwd(), 'dist', 'index.html');
      const htmlContent = readFileSync(distIndexPath, 'utf-8');
      
      // Should use the GitVersion env var
      expect(htmlContent).toContain('<span class="version">v1.2.3-beta.4</span>');
      expect(htmlContent).toContain('<meta name="app-version" content="1.2.3-beta.4"');
      
    } finally {
      // Restore environment variables
      if (originalSemVer !== undefined) {
        process.env.GITVERSION_SEMVER = originalSemVer;
      } else {
        delete process.env.GITVERSION_SEMVER;
      }
      if (originalFullSemVer !== undefined) {
        process.env.GITVERSION_FULLSEMVER = originalFullSemVer;
      } else {
        delete process.env.GITVERSION_FULLSEMVER;
      }
      if (originalInformationalVersion !== undefined) {
        process.env.GITVERSION_INFORMATIONALVERSION = originalInformationalVersion;
      } else {
        delete process.env.GITVERSION_INFORMATIONALVERSION;
      }
    }
  });
});