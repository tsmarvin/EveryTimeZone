import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

function getGitVersion(): string {
  // First, check if GitVersion environment variables are available (from CI)
  const envSemVer = process.env.GITVERSION_SEMVER;

  if (envSemVer) {
    console.log(`Using GitVersion from environment: ${envSemVer}`);
    return envSemVer;
  }

  try {
    // Try GitVersion CLI tool (if available locally)
    const gitVersionOutput = execSync('gitversion', { encoding: 'utf-8', cwd: process.cwd() });
    const gitVersionData = JSON.parse(gitVersionOutput);
    console.log(`Using GitVersion from CLI: ${gitVersionData.SemVer || gitVersionData.FullSemVer}`);
    return gitVersionData.SemVer || gitVersionData.FullSemVer;
  } catch {
    // Fallback to simple git tag approach
    try {
      // Ensure tags are fetched (helpful in CI environments)
      try {
        execSync('git fetch --tags', { stdio: 'pipe', cwd: process.cwd() });
        console.log('Tags fetched successfully');
      } catch {
        console.log('Failed to fetch tags, continuing anyway');
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
        console.log(`Last tag: ${lastTag}, commits since: ${commits}`);
      } catch (tagError) {
        console.log(`No tags found: ${tagError}, generating version from scratch`);
        // No tags exist, generate a proper version based on branch
        const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: process.cwd() }).trim();
        const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: process.cwd() }).trim();
        if (branch === 'main') {
          console.log(`No tags available, using default main version: 1.0.0+${shortHash}`);
          return `1.0.0+${shortHash}`;
        } else {
          console.log(`No tags available, using default feature branch version: 0.0.1-alpha.${shortHash}`);
          return `0.0.1-alpha.${shortHash}`;
        }
      }

      // Parse the tag version - handle both normal and pre-release tags
      const match = lastTag.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
      if (!match || !match[1] || !match[2] || !match[3]) {
        console.log(`Tag format not recognized: ${lastTag}, falling back to generated version`);
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
      console.log(`Current branch: ${branch}`);

      // If we're exactly on a tag, use the tag directly
      if (commits === 0) {
        const cleanTag = lastTag.replace(/^v/, '');
        console.log(`Using exact tag version: ${cleanTag}`);
        return cleanTag;
      }

      // For commits beyond the tag, increment appropriately based on branch
      if (branch === 'main') {
        patch += 1;
        const version = `${major}.${minor}.${patch}`;
        console.log(`Using fallback git logic for main branch: ${version}`);
        return version;
      } else {
        patch += 1;
        const version = `${major}.${minor}.${patch}-alpha.${commits}`;
        console.log(`Using fallback git logic for feature branch: ${version}`);
        return version;
      }
    } catch (gitError) {
      console.log(`Git operations failed: ${gitError}`);
      // Last resort - generate a proper version format
      try {
        const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: process.cwd() }).trim();
        const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: process.cwd() }).trim();
        if (branch === 'main') {
          console.log(`Using basic fallback for main: 1.0.0+${shortHash}`);
          return `1.0.0+${shortHash}`;
        } else {
          console.log(`Using basic fallback for feature branch: 0.0.1-alpha.${shortHash}`);
          return `0.0.1-alpha.${shortHash}`;
        }
      } catch {
        console.log('All git operations failed, using minimal fallback');
        return '0.0.1-unknown';
      }
    }
  }
}

function injectVersionIntoHtml(): void {
  const distIndexPath = join(process.cwd(), 'dist', 'index.html');

  if (!existsSync(distIndexPath)) {
    console.error('dist/index.html not found. Run build first.');
    process.exit(1);
  }

  const version = getGitVersion();
  let htmlContent = readFileSync(distIndexPath, 'utf-8');

  // Remove any existing app-version meta tags
  htmlContent = htmlContent.replace(/<meta name="app-version"[^>]*>\s*/g, '');

  // Remove any existing version spans in footer
  htmlContent = htmlContent.replace(/<span class="version">[^<]*<\/span>\s*/g, '');

  // Inject meta tag after the viewport meta tag
  const metaTagRegex = /(<meta name="viewport"[^>]*>)/;
  if (metaTagRegex.test(htmlContent)) {
    htmlContent = htmlContent.replace(metaTagRegex, `$1\n    <meta name="app-version" content="${version}" />`);
  }

  // Inject version into footer
  const footerRegex = /(<footer class="footer">[\s\S]*?<div class="container">[\s\S]*?<p>)/;
  if (footerRegex.test(htmlContent)) {
    const testSitePath = process.env.TEST_SITE_PATH;
    let versionHtml = `\n          <span class="version">v${version}</span>\n          `;

    // Add test site link if this is the main site build (has TEST_SITE_PATH env var)
    if (testSitePath) {
      versionHtml += `\n          - preview the <a href="https://www.everytimezone.net/${testSitePath}/" target="_blank" rel="noopener noreferrer">test site</a>\n          `;
    }

    htmlContent = htmlContent.replace(footerRegex, `$1${versionHtml}`);
  }

  writeFileSync(distIndexPath, htmlContent, 'utf-8');
  console.log(`Version ${version} injected into dist/index.html`);
}

// Run the injection
injectVersionIntoHtml();
