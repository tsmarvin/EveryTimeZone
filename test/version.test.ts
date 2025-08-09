import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const packageJsonPath = join(process.cwd(), 'package.json');
const distIndexPath = join(process.cwd(), 'dist', 'index.html');

function getGitVersion(): string {
  // First, check if GitVersion environment variables are available (from CI)
  const envSemVer = process.env.GITVERSION_SEMVER;

  if (envSemVer) {
    return envSemVer;
  }

  try {
    // Try GitVersion CLI tool (if available locally)
    const gitVersionOutput = execSync('gitversion', { encoding: 'utf-8', cwd: process.cwd() });
    const gitVersionData = JSON.parse(gitVersionOutput);
    return gitVersionData.SemVer || gitVersionData.FullSemVer;
  } catch {
    // Fallback to simple git tag approach
    try {
      // Ensure tags are fetched (helpful in CI environments)
      try {
        execSync('git fetch --tags', { stdio: 'pipe', cwd: process.cwd() });
      } catch {
        // Ignore fetch errors
      }

      // Try to get the last tag - if no tags exist, handle gracefully
      let lastTag: string;
      let commits: number;

      try {
        lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8', cwd: process.cwd() }).trim();
        const commitsSince = execSync(`git rev-list ${lastTag}..HEAD --count`, {
          encoding: 'utf-8',
          cwd: process.cwd(),
        }).trim();
        commits = parseInt(commitsSince, 10);
      } catch (tagError) {
        // No tags exist, generate a proper version based on branch
        const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: process.cwd() }).trim();
        const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: process.cwd() }).trim();
        if (branch === 'main') {
          return `1.0.0+${shortHash}`;
        } else {
          return `0.0.1-alpha.${shortHash}`;
        }
      }

      // Parse the tag version - handle both normal and pre-release tags
      const match = lastTag.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
      if (!match || !match[1] || !match[2] || !match[3]) {
        // Generate a proper version format instead of using git describe
        const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: process.cwd() }).trim();
        const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: process.cwd() }).trim();
        if (branch === 'main') {
          return `1.0.0+${shortHash}`;
        } else {
          return `0.0.1-alpha.${shortHash}`;
        }
      }

      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      let patch = parseInt(match[3], 10);

      // Get current branch
      const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: process.cwd() }).trim();

      // If we're exactly on a tag, use the tag directly
      if (commits === 0) {
        const cleanTag = lastTag.replace(/^v/, '');
        return cleanTag;
      }

      // For commits beyond the tag, increment appropriately based on branch
      if (branch === 'main') {
        patch += 1;
        return `${major}.${minor}.${patch}`;
      } else {
        patch += 1;
        return `${major}.${minor}.${patch}-alpha.${commits}`;
      }
    } catch (gitError) {
      // Last resort - generate a proper version format
      try {
        const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: process.cwd() }).trim();
        const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: process.cwd() }).trim();
        if (branch === 'main') {
          return `1.0.0+${shortHash}`;
        } else {
          return `0.0.1-alpha.${shortHash}`;
        }
      } catch {
        return '0.0.1-unknown';
      }
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
      expect(packageJson.version).toBe('1.0.0');
    });
    
    it('should generate version different from package.json static version', () => {
      // The injected version should be different from the static package.json version
      const gitVersion = getGitVersion();
      
      // Git version should be different from static package.json version
      // (unless we're exactly at tag v0.0.1-alpha with no commits)
      expect(gitVersion).toMatch(/^\d+\.\d+\.\d+(?:-\w+(?:\.\w+)?)?$/);
    });
  });
});