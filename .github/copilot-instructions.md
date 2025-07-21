# Agents.md

## Repository Overview

This repository hosts a static timezone overlap visualization tool deployed via GitHub Pages. The site allows users to visualize timezone overlaps over specified periods, with all configuration stored in the URL for easy sharing.

## Architecture

**Static Site Structure:**
- Primary development occurs on `main` branch
- GitHub Actions automatically builds and deploys to `gh-pages` branch on merge
- HTML/CSS for UI with TypeScript for logic
- No compilation required (TypeScript transpilation only)

**Key Features:**
- URL-based configuration storage for shareability
- Timezone overlap visualization
- Static hosting via GitHub Pages
- Automated deployment on merge to main

## Development Guidelines

### Technology Stack
- **Frontend:** HTML, CSS, TypeScript
- **Hosting:** GitHub Pages
- **CI/CD:** GitHub Actions
- **Code Quality:** Style checks enforced during PRs. Commitlint is used to ensure all commits follow conventional commit formatting.

### Commit Standards
**REQUIRED:** All commits must follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#specification)

Enforced via [commitlint](https://commitlint.js.org/)

**Examples:**
```
feat: add timezone selection dropdown
fix: resolve overlap calculation for DST transitions
docs: update README with setup instructions
refactor: extract timezone utils to separate module
```

### Code Standards
- Follow the established style guide
- Use TypeScript for complex logic
- Maintain clean, readable HTML/CSS
- Write meaningful commit messagesv