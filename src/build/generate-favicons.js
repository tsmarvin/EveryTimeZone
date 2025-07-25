#!/usr/bin/env node

/**
 * Favicon Generation Script
 * Generates all required favicon formats from the SVG source
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const FAVICON_SVG = 'src/favicon.svg';
const DIST_DIR = 'dist';

// Check if ImageMagick is available
function hasImageMagick() {
  try {
    execSync('magick -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Generate favicon formats
function generateFavicons() {
  if (!existsSync(FAVICON_SVG)) {
    console.log('SVG favicon not found, skipping favicon generation');
    return;
  }

  console.log('Generating favicon formats...');

  const formats = [
    { size: '16x16', name: 'favicon-16x16.png' },
    { size: '32x32', name: 'favicon-32x32.png' },
    { size: '180x180', name: 'apple-touch-icon.png' },
    { size: '192x192', name: 'android-chrome-192x192.png' },
    { size: '512x512', name: 'android-chrome-512x512.png' },
  ];

  if (hasImageMagick()) {
    // Use ImageMagick to convert SVG to PNG formats
    formats.forEach(({ size, name }) => {
      try {
        const outputPath = path.join(DIST_DIR, name);
        execSync(`magick -background transparent "${FAVICON_SVG}" -resize ${size} "${outputPath}"`, {
          stdio: 'ignore',
        });
        console.log(`Generated ${name}`);
      } catch (error) {
        console.warn(`Failed to generate ${name}: ${error.message}`);
      }
    });

    // Generate ICO file (16x16 and 32x32 combined)
    try {
      const icoPath = path.join(DIST_DIR, 'favicon.ico');
      execSync(`magick "${FAVICON_SVG}" -resize 16x16 -background transparent ico16.png`, { stdio: 'ignore' });
      execSync(`magick "${FAVICON_SVG}" -resize 32x32 -background transparent ico32.png`, { stdio: 'ignore' });
      execSync(`magick ico16.png ico32.png "${icoPath}"`, { stdio: 'ignore' });
      execSync('rm -f ico16.png ico32.png', { stdio: 'ignore' });
      console.log('Generated favicon.ico');
    } catch (error) {
      console.warn(`Failed to generate favicon.ico: ${error.message}`);
    }
  } else {
    console.log('ImageMagick not available, creating placeholder favicon files...');

    // Create simple placeholder files that reference the SVG
    const placeholderContent = `<!-- Placeholder: Use ${FAVICON_SVG} as primary favicon -->`;

    formats.forEach(({ name }) => {
      const outputPath = path.join(DIST_DIR, name);
      writeFileSync(outputPath, placeholderContent);
      console.log(`Created placeholder ${name}`);
    });

    // Create a basic ICO placeholder
    writeFileSync(path.join(DIST_DIR, 'favicon.ico'), placeholderContent);
    console.log('Created placeholder favicon.ico');
  }

  console.log('Favicon generation complete!');
}

generateFavicons();
