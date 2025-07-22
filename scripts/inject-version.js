#!/usr/bin/env node

/**
 * Injects version information into built HTML files
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();
const distPath = join(projectRoot, 'dist');
const packageJsonPath = join(projectRoot, 'package.json');

function injectVersionIntoHtml() {
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const version = packageJson.version;
    
    const htmlPath = join(distPath, 'index.html');
    let htmlContent = readFileSync(htmlPath, 'utf-8');
    
    // Inject version into footer
    const footerPattern = /(<footer class="footer">[\s\S]*?<p>)([\s\S]*?)(<\/p>[\s\S]*?<\/footer>)/;
    const replacement = `$1$2
          <span class="version">v${version}</span>$3`;
    
    htmlContent = htmlContent.replace(footerPattern, replacement);
    
    // Also add version as a meta tag for programmatic access
    const headPattern = /(<\/head>)/;
    const metaTag = `    <meta name="app-version" content="${version}" />\n$1`;
    htmlContent = htmlContent.replace(headPattern, metaTag);
    
    writeFileSync(htmlPath, htmlContent);
    console.log(`Injected version ${version} into HTML`);
    
  } catch (error) {
    console.error('Error injecting version into HTML:', error.message);
    process.exit(1);
  }
}

injectVersionIntoHtml();