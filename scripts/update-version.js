#!/usr/bin/env node

/**
 * Updates package.json version based on git information and gitversion.yml configuration
 * This script mimics basic GitVersion functionality for local development
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf-8', cwd: projectRoot }).trim();
  } catch (error) {
    console.warn('Could not determine current branch, using main');
    return 'main';
  }
}

function getLastTag() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf-8', cwd: projectRoot }).trim();
  } catch (error) {
    // No tags found, start with v0.0.0
    return 'v0.0.0';
  }
}

function getCommitsSinceTag(tag) {
  try {
    const commits = execSync(`git rev-list ${tag}..HEAD --count`, { encoding: 'utf-8', cwd: projectRoot }).trim();
    return parseInt(commits, 10);
  } catch (error) {
    return 0;
  }
}

function parseVersion(versionString) {
  const match = versionString.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    return { major: 0, minor: 0, patch: 0, prerelease: null };
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null
  };
}

function tryGitVersion() {
  try {
    // Try to use GitVersion if available (in CI environments)
    const gitVersionOutput = execSync('gitversion', { encoding: 'utf-8', cwd: projectRoot });
    const gitVersionData = JSON.parse(gitVersionOutput);
    return gitVersionData.SemVer || gitVersionData.FullSemVer;
  } catch (error) {
    // GitVersion not available, fall back to our implementation
    return null;
  }
}

function generateVersion() {
  // First try GitVersion if available (preferred for CI)
  const gitVersionResult = tryGitVersion();
  if (gitVersionResult) {
    console.log('Using GitVersion for version generation');
    return gitVersionResult;
  }

  console.log('GitVersion not available, using fallback implementation');
  
  const branch = getCurrentBranch();
  const lastTag = getLastTag();
  const commitsSinceTag = getCommitsSinceTag(lastTag);
  const { major, minor, patch } = parseVersion(lastTag);

  let newVersion;
  let prerelease = '';

  // Simple branch-based versioning logic based on gitversion.yml
  if (branch === 'main') {
    // On main branch, increment patch for each commit since last tag
    newVersion = `${major}.${minor}.${patch + (commitsSinceTag > 0 ? commitsSinceTag : 0)}`;
  } else if (branch.startsWith('feature/') || branch.startsWith('features/')) {
    // Feature branches get alpha prerelease
    newVersion = `${major}.${minor}.${patch + 1}`;
    prerelease = `alpha.${commitsSinceTag}`;
  } else if (branch.startsWith('release/') || branch.startsWith('releases/')) {
    // Release branches get beta prerelease
    newVersion = `${major}.${minor}.${patch}`;
    prerelease = `beta.${commitsSinceTag}`;
  } else if (branch.startsWith('hotfix/')) {
    // Hotfix branches increment patch with beta
    newVersion = `${major}.${minor}.${patch + 1}`;
    prerelease = `beta.${commitsSinceTag}`;
  } else {
    // Default: use alpha for other branches
    newVersion = `${major}.${minor}.${patch + 1}`;
    prerelease = `alpha.${commitsSinceTag}`;
  }

  // Add prerelease if applicable
  if (prerelease && commitsSinceTag > 0) {
    newVersion += `-${prerelease}`;
  }

  return newVersion;
}

function updatePackageJson(version) {
  const packageJsonPath = join(projectRoot, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  
  const oldVersion = packageJson.version;
  packageJson.version = version;
  
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(`Updated package.json version: ${oldVersion} → ${version}`);
  return { oldVersion, newVersion: version };
}

function main() {
  try {
    const newVersion = generateVersion();
    const result = updatePackageJson(newVersion);
    
    // Output version info for CI/CD use
    console.log(`::set-output name=version::${result.newVersion}`);
    console.log(`PACKAGE_VERSION=${result.newVersion}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating version:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateVersion, updatePackageJson };