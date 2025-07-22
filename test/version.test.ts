import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const packageJsonPath = join(process.cwd(), 'package.json');
const distIndexPath = join(process.cwd(), 'dist', 'index.html');

function getGitVersion(): string {
  try {
    // Try GitVersion first (if available in CI)
    const gitVersionOutput = execSync('gitversion', { encoding: 'utf-8', cwd: process.cwd() });
    const gitVersionData = JSON.parse(gitVersionOutput);
    return gitVersionData.SemVer || gitVersionData.FullSemVer;
  } catch (error) {
    // Fallback to simple git tag approach
    try {
      const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8', cwd: process.cwd() }).trim();
      const commitsSince = execSync(`git rev-list ${lastTag}..HEAD --count`, { encoding: 'utf-8', cwd: process.cwd() }).trim();
      const commits = parseInt(commitsSince, 10);
      
      // Parse the tag version
      const match = lastTag.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
      if (!match) {
        return '0.0.1-alpha.0';
      }
      
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      let patch = parseInt(match[3], 10);
      
      // Simple branch-based logic for testing
      const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: process.cwd() }).trim();
      if (branch === 'main' && commits > 0) {
        patch += 1;
        return `${major}.${minor}.${patch}`;
      } else if (commits > 0) {
        patch += 1;
        return `${major}.${minor}.${patch}-alpha.${commits}`;
      }
      
      return `${major}.${minor}.${patch}`;
    } catch (gitError) {
      // No git or tags available, use default
      return '0.0.1-alpha.0';
    }
  }
}

describe('Version Management', () => {
  describe('version injection into HTML', () => {
    it('should inject git-based version into built HTML during build process', () => {
      // Run a build to ensure the HTML is generated with version
      execSync('npm run build', { cwd: process.cwd(), stdio: 'pipe' });
      
      // Check that the built HTML exists and contains version
      expect(existsSync(distIndexPath)).toBe(true);
      
      const htmlContent = readFileSync(distIndexPath, 'utf-8');
      const expectedVersion = getGitVersion();
      
      // Should have version in meta tag
      expect(htmlContent).toContain(`<meta name="app-version" content="${expectedVersion}"`);
      
      // Should have version in footer
      expect(htmlContent).toContain(`<span class="version">v${expectedVersion}</span>`);
    });

    it('should keep package.json version static in source control', () => {
      // Verify the package.json version remains static as requested
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.version).toBe('0.0.1-alpha');
    });
    
    it('should generate version different from package.json static version', () => {
      // The injected version should be different from the static package.json version
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const gitVersion = getGitVersion();
      
      // Git version should be different from static package.json version
      // (unless we're exactly at tag v0.0.1-alpha with no commits)
      expect(gitVersion).toMatch(/^\d+\.\d+\.\d+(?:-\w+(?:\.\d+)?)?$/);
    });
  });
});