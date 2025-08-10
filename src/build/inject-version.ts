import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

function getGitVersion(): string {
  // Priority 1: GitVersion environment variables (from CI)
  const envSemVer = process.env.GITVERSION_SEMVER;
  const envFullSemVer = process.env.GITVERSION_FULLSEMVER;

  if (envSemVer || envFullSemVer) {
    const version = envSemVer || envFullSemVer || '';
    console.log(`Using GitVersion from environment: ${version}`);
    return version;
  }

  // Priority 2: GitVersion CLI (if available)
  try {
    const gitVersionOutput = execSync('gitversion', { encoding: 'utf-8', cwd: process.cwd() });
    const gitVersionData = JSON.parse(gitVersionOutput);
    const version = gitVersionData.SemVer || gitVersionData.FullSemVer;
    console.log(`Using GitVersion from CLI: ${version}`);
    return version;
  } catch (gitVersionError) {
    console.log(`GitVersion CLI not available: ${gitVersionError}`);
  }

  // Check if we're in a CI environment or main/develop branch where GitVersion should be required
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  let currentBranch = '';

  // In CI, use environment variable branch info first
  if (isCI && process.env.GITHUB_REF_NAME) {
    currentBranch = process.env.GITHUB_REF_NAME;
  } else {
    try {
      currentBranch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: process.cwd() }).trim();
    } catch {
      // Might be in detached HEAD state (common in CI)
      currentBranch = process.env.GITHUB_REF_NAME || '';
    }
  }

  // For CI environments or main/develop branches, GitVersion should always be available
  if (isCI && (currentBranch === 'main' || currentBranch === 'develop')) {
    throw new Error(
      `GitVersion is required for ${currentBranch} branch in CI environment, but was not available. ` +
        `Expected GITVERSION_SEMVER environment variable or working 'gitversion' CLI tool.`,
    );
  }

  // Fallback for local development only
  console.log('GitVersion not available, using fallback for local development');
  try {
    const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8', cwd: process.cwd() }).trim();
    const commitsSince = execSync(`git rev-list ${lastTag}..HEAD --count`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
    }).trim();
    const commits = parseInt(commitsSince, 10);

    // Parse the tag version
    const match = lastTag.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match || !match[1] || !match[2] || !match[3]) {
      console.log('Using default fallback version: 1.0.0');
      return '1.0.0';
    }

    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    let patch = parseInt(match[3], 10);

    if (commits > 0) {
      patch += 1;
      const version = `${major}.${minor}.${patch}-alpha.${commits}`;
      console.log(`Using fallback git logic: ${version}`);
      return version;
    }

    const version = `${major}.${minor}.${patch}`;
    console.log(`Using fallback git logic for tagged commit: ${version}`);
    return version;
  } catch {
    // Last resort fallback
    console.log('No git available, using default version: 1.0.0');
    return '1.0.0';
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

  // Inject version into footer by replacing entire paragraph content
  const footerRegex = /(<footer class="footer">[\s\S]*?<div class="container">[\s\S]*?<p>)[\s\S]*?(<\/p>)/;
  if (footerRegex.test(htmlContent)) {
    const testSitePath = process.env.TEST_SITE_PATH;
    let footerContent = `\n                <span class="version">v${version}</span>\n                <a href="https://github.com/tsmarvin/EveryTimeZone" target="_blank" rel="noopener noreferrer">View on GitHub</a>`;

    // Add test site link if this is the main site build (has TEST_SITE_PATH env var)
    if (testSitePath) {
      footerContent += `,\n                <a href="https://www.everytimezone.net/${testSitePath}/" target="_blank" rel="noopener noreferrer">Test the development site</a>`;
    }
    footerContent += '\n              ';

    htmlContent = htmlContent.replace(footerRegex, `$1${footerContent}$2`);
  }

  writeFileSync(distIndexPath, htmlContent, 'utf-8');
  console.log(`Version ${version} injected into dist/index.html`);
}

// Run the injection
injectVersionIntoHtml();
