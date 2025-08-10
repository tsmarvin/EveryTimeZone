import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

function getGitVersion(): string {
  // Check GitVersion environment variables (from CI)
  const envSemVer = process.env.GITVERSION_SEMVER;
  const envFullSemVer = process.env.GITVERSION_FULLSEMVER;

  if (envSemVer || envFullSemVer) {
    const version = envSemVer || envFullSemVer || '';
    console.log(`Using GitVersion from environment: ${version}`);
    return version;
  }

  // Try GitVersion CLI
  try {
    const gitVersionOutput = execSync('gitversion', { encoding: 'utf-8', cwd: process.cwd() });
    const gitVersionData = JSON.parse(gitVersionOutput);
    const version = gitVersionData.SemVer || gitVersionData.FullSemVer;
    console.log(`Using GitVersion from CLI: ${version}`);
    return version;
  } catch (gitVersionError) {
    throw new Error(
      `GitVersion is required but was not available. ` +
        `Expected GITVERSION_SEMVER environment variable or working 'gitversion' CLI tool. ` +
        `Error: ${gitVersionError}`,
    );
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
