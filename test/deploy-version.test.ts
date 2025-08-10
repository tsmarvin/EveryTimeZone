import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Deploy Version Behavior', () => {
  it('should fail when GitVersion is not available', () => {
    // This test validates that the inject-version script requires GitVersion
    // and fails immediately when GitVersion is not available
    
    // Store original values
    const originalSemVer = process.env.GITVERSION_SEMVER;
    const originalFullSemVer = process.env.GITVERSION_FULLSEMVER;
    const originalInformationalVersion = process.env.GITVERSION_INFORMATIONALVERSION;
    
    try {
      // Clear GitVersion environment variables to simulate no GitVersion scenario
      delete process.env.GITVERSION_SEMVER;
      delete process.env.GITVERSION_FULLSEMVER;
      delete process.env.GITVERSION_INFORMATIONALVERSION;
      
      // Build without GitVersion should fail
      expect(() => {
        execSync('npm run build', { cwd: process.cwd(), stdio: 'pipe' });
      }).toThrow();
      
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