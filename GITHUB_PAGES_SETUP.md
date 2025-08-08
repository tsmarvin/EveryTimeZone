# GitHub Pages Setup

This repository uses GitHub Actions for deploying to GitHub Pages.

## How It Works

### Main Branch Deployment
- When code is pushed to `main` branch, the deploy workflow builds the site
- The built files are deployed directly via GitHub Actions
- The main site is accessible at `https://everytimezone.net/`

### Develop Branch Previews
**Note**: GitHub Actions deployment only supports deploying to the root domain. Subdirectory previews (like `test-PR146/`) are not supported with GitHub Actions deployment.

For develop branch previews, consider these alternatives:
1. Use external hosting services (Netlify, Vercel) for PR previews
2. Deploy to separate GitHub repositories
3. Use GitHub Environments with different domains

The current develop branch workflow has been disabled as it's incompatible with GitHub Actions deployment.