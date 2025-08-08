import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

function getSmartFallbackVersion(): string {
  // Try to determine a reasonable fallback version
  try {
    // Check if we can get the current branch name
    const branch = execSync('git branch --show-current', {
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: 'pipe',
    }).trim();

    console.log(`Detected branch: '${branch}'`);

    // For non-main branches, generate an alpha version
    if (branch && branch !== 'main') {
      // Use a timestamp-based version for feature branches
      const timestamp = Math.floor(Date.now() / 1000);
      const shortTimestamp = timestamp.toString().slice(-6); // Last 6 digits
      const version = `0.0.1-alpha.${shortTimestamp}`;
      console.log(`Generated smart fallback version for branch '${branch}': ${version}`);
      return version;
    }

    // Only return 1.0.0 for explicitly detected main branch
    if (branch === 'main') {
      console.log('Using smart fallback version for main branch: 1.0.0');
      return '1.0.0';
    }

    // If branch is empty/unknown but git worked, assume it's a feature branch in CI
    console.log('Branch detection unclear, assuming feature branch and generating alpha version');
    const timestamp = Math.floor(Date.now() / 1000);
    const shortTimestamp = timestamp.toString().slice(-6);
    const version = `0.0.1-alpha.${shortTimestamp}`;
    console.log(`Generated alpha version for unknown branch: ${version}`);
    return version;
  } catch (error) {
    // If git operations fail entirely, still generate alpha version for safety
    // This ensures we don't accidentally return 1.0.0 for feature branches in CI
    console.log(`Git operations failed (${error}), generating alpha version for safety`);
    const timestamp = Math.floor(Date.now() / 1000);
    const shortTimestamp = timestamp.toString().slice(-6);
    const version = `0.0.1-alpha.${shortTimestamp}`;
    console.log(`Generated safe alpha fallback version: ${version}`);
    return version;
  }
}

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

      // Check current branch first for debugging
      let branch = '';
      try {
        branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: process.cwd() }).trim();
        console.log(`Current branch: ${branch}`);
      } catch (branchError) {
        console.log(`Failed to get branch: ${branchError}`);
      }

      const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8', cwd: process.cwd() }).trim();
      console.log(`Last tag found: ${lastTag}`);

      const commitsSince = execSync(`git rev-list ${lastTag}..HEAD --count`, {
        encoding: 'utf-8',
        cwd: process.cwd(),
      }).trim();
      const commits = parseInt(commitsSince, 10);
      console.log(`Commits since tag: ${commits}`);

      // If the tag already contains version info, use it directly for tagged commits
      if (commits === 0) {
        // We're exactly on a tag - use the tag directly
        const cleanTag = lastTag.replace(/^v/, '');
        console.log(`Using exact tag version: ${cleanTag}`);
        return cleanTag;
      }

      // Parse the tag version - handle both normal and pre-release tags
      const match = lastTag.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
      if (!match || !match[1] || !match[2] || !match[3]) {
        console.log('Tag format not recognized, using smart fallback version');
        return getSmartFallbackVersion();
      }

      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      let patch = parseInt(match[3], 10);
      const prerelease = match[4]; // This captures any pre-release part like "65"

      // Simple branch-based logic (use the branch we already fetched)
      if (branch === 'main' && commits > 0) {
        patch += 1;
        const version = `${major}.${minor}.${patch}`;
        console.log(`Using fallback git logic for main branch: ${version}`);
        return version;
      } else if (commits > 0) {
        patch += 1;
        const version = `${major}.${minor}.${patch}-alpha.${commits}`;
        console.log(`Using fallback git logic for feature branch: ${version}`);
        return version;
      }

      // This shouldn't happen since commits === 0 is handled above, but just in case
      const version = prerelease ? `${major}.${minor}.${patch}-${prerelease}` : `${major}.${minor}.${patch}`;
      console.log(`Using fallback git logic: ${version}`);
      return version;
    } catch (gitError) {
      // Git operations failed - try smart fallback
      const errorMessage = gitError instanceof Error ? gitError.message : String(gitError);
      console.log(`Git operations failed (${errorMessage}), using smart fallback version`);
      return getSmartFallbackVersion();
    }
  }
}

function injectVersionIntoHtml(): void {
  const distIndexPath = join(process.cwd(), 'dist', 'index.html');

  if (!existsSync(distIndexPath)) {
    console.error('dist/index.html not found. Run build first.');
    process.exit(1);
  }

  let version = getGitVersion();

  // Final safety check: if we somehow got '1.0.0' for a non-main branch,
  // force generate an alpha version to prevent CI test failures
  if (version === '1.0.0') {
    try {
      const branch = execSync('git branch --show-current', {
        encoding: 'utf-8',
        cwd: process.cwd(),
        stdio: 'pipe',
      }).trim();

      console.log(`Final safety check: version is '1.0.0' on branch '${branch}'`);

      if (branch && branch !== 'main') {
        console.log('Non-main branch detected with 1.0.0 version, forcing alpha generation');
        const timestamp = Math.floor(Date.now() / 1000);
        const shortTimestamp = timestamp.toString().slice(-6);
        version = `0.0.1-alpha.${shortTimestamp}`;
        console.log(`Final safety override version: ${version}`);
      }
    } catch {
      // If branch detection fails but we have 1.0.0, be safe and generate alpha
      console.log('Branch detection failed for 1.0.0 version, generating alpha for safety');
      const timestamp = Math.floor(Date.now() / 1000);
      const shortTimestamp = timestamp.toString().slice(-6);
      version = `0.0.1-alpha.${shortTimestamp}`;
      console.log(`Final emergency alpha version: ${version}`);
    }
  }

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
