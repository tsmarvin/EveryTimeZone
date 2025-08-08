# GitHub Pages Configuration Setup

This document describes the required GitHub Pages configuration changes to enable both main branch deployments and develop branch preview deployments.

## Required Configuration Change

**IMPORTANT**: After merging this PR, you must manually update the GitHub Pages source configuration:

1. Go to your repository's **Settings** tab
2. Scroll down to **Pages** section in the left sidebar
3. Under **Source**, change from "GitHub Actions" to "Deploy from a branch"
4. Select **Branch: gh-pages** and **/ (root)**
5. Click **Save**

## How It Works

### Main Branch Deployment
- When code is pushed to `main` branch, the deploy workflow builds the site
- The built files are deployed to the **root** of the `gh-pages` branch
- The main deployment cleans up any old develop branch preview directories
- The main site is accessible at `https://everytimezone.net/`

### Develop Branch Deployment  
- When code is pushed to `develop` branch, the deploy-develop workflow builds the site
- The built files are deployed to a **subdirectory** on the `gh-pages` branch (e.g., `test-PR146/`)
- Preview sites are accessible at `https://everytimezone.net/test-PR146/`
- The subdirectory name is determined by extracting the PR number from git history

## Benefits

- ✅ Main branch deployments work normally
- ✅ Develop branch creates accessible preview sites  
- ✅ Preview sites are automatically cleaned up when main is deployed
- ✅ Multiple develop deployments can coexist as different subdirectories
- ✅ All deployments are served by the same GitHub Pages instance

## Troubleshooting

If preview sites are not accessible:
1. Verify GitHub Pages is set to serve from `gh-pages` branch (not GitHub Actions)
2. Check that the `gh-pages` branch contains the expected subdirectory
3. Ensure the subdirectory contains an `index.html` file
4. Check that `.nojekyll` file exists in the root of `gh-pages` branch

## Previous Issue

The previous setup used GitHub Actions for deployment, which only served the root directory. Subdirectories added to the `gh-pages` branch by the develop workflow were not accessible because GitHub Pages was not configured to serve from that branch.