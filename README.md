# Every Time Zone

A static timezone visualization tool for easy sharing and collaboration. Visualize timezone overlaps across the globe with daylight indicators and responsive design. All configuration is stored in the URL for easy sharing.


The v0.0.1-alpha codebase was created almost entirely by copilot agentic AI.  This was all done in a private repo before being merged here for continued development.  

Across 29 pull requests the copilot Agentic AI ran 144 separate times. Here are the stats:  
```
Count             : 144
Average           : 538.77 Seconds
Sum               : 77583 Seconds
Maximum           : 1717 Seconds
Minimum           : 64 Seconds
StandardDeviation : 341.96 Seconds
```


## Features

- **Interactive timezone visualization**: Select and display multiple timezones with hour-by-hour timeline
- **Daylight/night indicators**: Shows sunrise/sunset periods using SunCalc library
- **Working hours highlighting**: Visual indicators for business hours (9 AM - 5 PM)
- **Responsive design**: Adapts timeline layout based on screen size
- **Theme system**: Multiple color themes with light/dark mode support
- **URL-based configuration**: All settings stored in URL parameters for easy sharing
- **Static deployment**: No server required - runs entirely in browser
- **TypeScript-based**: Modern development with type safety and ES2022 modules


## Live Site

[View the live application](https://www.everytimezone.net/?mode=light)


## Quick Start

### Prerequisites

Node.js 22.0+, npm, Git, and a modern web browser.

### Setup & Installation

1. **Clone the repository**
```bash
git clone https://github.com/tsmarvin/EveryTimeZone.git
cd EveryTimeZone
```

2. **Install dependencies**
```bash
npm install
# or if you prefer yarn
yarn install
```

3. **Start development server**
```bash
./dev-server.sh    # Build and serve at http://localhost:8000
npm run dev        # Alternative using TypeScript watch mode
```

4. **Open your browser**
Navigate to `http://localhost:8000`


## Development Overview

#### Project Structure
```
EveryTimeZone/
├── .devcontainer/         # Codespaces configuration
├── .github/               # GitHub workflows and configs
│   └── workflows/         # CI/CD workflows
│       ├── ci.yaml        # Pull Request Actions
│       ├── deploy.yaml    # Deploys the built static site to GitHub pages on merges to main
│       └── release.yml    # Publishes GitHub releases on merges to main
├── .husky/                # Git hooks
├── src/                   # Source code
│   ├── index.html         # Main HTML file
│   ├── styles/            # CSS styles with theme system
│   └── scripts/           # TypeScript modules
│       ├── app.ts         # Application coordinator
│       ├── index.ts       # Main timezone logic and timeline rendering
│       └── settings.ts    # Settings panel and theme management
├── test/                  # Test suite (Vitest + jsdom)
├── dist/                  # Built files (auto-generated)
├── .gitignore             # Git ignore patterns
├── .prettierignore        # Prettier ignore patterns
├── .prettierrc            # Prettier configuration
├── CODESPACES.md          # GitHub Codespaces documentation
├── LICENSE                # MIT license
├── commitlint.config.cjs  # Commit message linting
├── dev-server.sh          # Development server script
├── eslint.config.js       # ESLint configuration
├── gitversion.yml         # GitVersion configuration
├── package.json           # Dependencies and scripts
├── package-lock.json      # Dependency lock file
├── tsconfig.json          # TypeScript configuration
├── vitest.config.ts       # Vitest test configuration
└── README.md              # This file
```

#### Available Scripts

- `npm run build`         - Build the project for production (TypeScript compilation + asset copying)
- `npm run dev`           - Start TypeScript watch mode for development  
- `npm run clean`         - Remove dist directory
- `npm run copy-assets`   - Copy HTML, CSS, and external libraries to dist
- `npm run test`          - Run full test suite (lint + type-check + unit tests)
- `npm run test:watch`    - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint`          - Run ESLint on TypeScript files
- `npm run lint:fix`      - Run ESLint with auto-fix
- `npm run format`        - Format code with Prettier
- `npm run format:check`  - Check code formatting
- `npm run type-check`    - Run TypeScript type checking without compilation

#### Code Quality Tools

This project uses several tools to maintain code quality:

- **TypeScript** - Type safety and better development experience
- **ESLint** - Code linting and style enforcement
- **Prettier** - Code formatting
- **Commitlint** - Enforces conventional commit messages
- **Husky** - Git hooks for pre-commit checks


### Technology Stack

- **Frontend:** HTML, CSS (with CSS custom properties for theming), TypeScript (ES2022 modules)
- **Timezone Logic:** Native browser Intl APIs for timezone detection and formatting
- **Astronomical Calculations:** SunCalc library for sunrise/sunset times
- **Build Process:** TypeScript compiler (tsc) with asset copying - no bundling
- **Testing:** Vitest with jsdom for DOM environment simulation
- **Code Quality:** ESLint + Prettier + TypeScript strict mode + Commitlint
- **Development:** Native ES modules with HTTP server for local development
- **Deployment:** GitHub Pages with automated deployment via GitHub Actions
- **Versioning:** GitVersion with conventional commits for semantic versioning


### Architecture

#### Core Components

**Timeline Visualization (`index.ts`)**
- Manages timeline display and selected timezones
- Provides searchable timezone selection with wheel navigation  
- Responsive calculations based on screen size
- Daylight indicators using SunCalc library

**Settings System (`settings.ts`)**  
- Manages appearance settings (theme + light/dark mode)
- URL persistence for appearance sharing
- CSS custom properties with 6 different color themes

**Application Coordination (`app.ts`)**
- Initializes components in correct order
- Handles DOM ready state and module loading

### Deployment

#### Automatic Deployment

GitHub Actions automatically handles deployment when code is merged into the `main` branch.

- The `release.yml` GitHub actions settings will publish the built site as a GitHub release on merges to main with automatically generated release notes from commit messages using conventional commit format.
- The `deploy.yml` GitHub actions settings will publish the built site to the `gh-pages` branch which will automatically published as a site using GitHub pages.
