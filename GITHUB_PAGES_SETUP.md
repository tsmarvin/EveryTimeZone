# GitHub Pages Setup

This repository uses GitHub Actions for deploying to GitHub Pages.

## How It Works

### Main Branch Deployment
- When code is pushed to `main` branch, the deploy workflow builds the site
- The built files are deployed directly via GitHub Actions
- The main site is accessible at `https://everytimezone.net/`

### Develop Branch Previews
**Note**: Subdirectory previews (such as `test-PR146/` for PRs or `develop/` for the develop branch) are now supported by combining main and develop builds in the GitHub Actions deployment workflow. The workflow builds and deploys each branch or PR preview to its own subdirectory under the main site.

The develop branch deployment workflow:
1. Builds the main branch content for the root directory
2. Builds the develop branch content with subdirectory-specific modifications
3. Combines both builds into a unified directory structure
4. Deploys the entire combined structure via GitHub Actions

This provides full subdirectory preview functionality while using GitHub's recommended Actions deployment method.