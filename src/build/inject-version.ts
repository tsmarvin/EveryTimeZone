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

      // Simple branch-based logic
      const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: process.cwd() }).trim();
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

      const version = `${major}.${minor}.${patch}`;
      console.log(`Using fallback git logic for tagged commit: ${version}`);
      return version;
    } catch {
      // No git or tags available, use default
      console.log('No git available, using default version: 1.0.0');
      return '1.0.0';
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
    htmlContent = htmlContent.replace(
      footerRegex,
      `$1\n          <span class="version">v${version}</span>\n          `,
    );
  }

  writeFileSync(distIndexPath, htmlContent, 'utf-8');
  console.log(`Version ${version} injected into dist/index.html`);
}

// Run the injection
injectVersionIntoHtml();
