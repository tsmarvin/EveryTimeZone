# Copilot Agent Instructions for EveryTimeZone

**MANDATORY STARTUP PROTOCOL - CRITICAL REQUIREMENT:**
Before starting any work, Copilot agents MUST read and recite these complete instructions to the log. This ensures full understanding of protocols, especially the critical screenshot workflow requirements. Failure to recite these instructions at the start of every job will result in immediate termination of the agent.

## Repository Overview

This repository hosts a static timezone overlap visualization tool deployed via GitHub Pages. The site allows users to visualize timezone overlaps over specified periods, with all configuration stored in the URL for easy sharing.

## Architecture

**Static Site Structure:**
- Primary development occurs on `main` branch
- GitHub Actions automatically builds and deploys to `gh-pages` branch on merge
- HTML/CSS for UI with TypeScript for logic
- Build process required: TypeScript compilation, asset copying, and version injection

**Key Features:**
- URL-based configuration storage for shareability
- Timezone overlap visualization
- Static hosting via GitHub Pages
- Automated deployment on merge to main

## Development Guidelines

### Build Process
**MANDATORY:** Always install dependencies and build the site properly before starting any work.

**Required Steps:**
1. **Install dependencies:** `npm install` (must be run first)
2. **Build the site:** `npm run build` (compiles TypeScript, copies assets, injects version)
3. **Output location:** Built files are placed in the `dist/` directory
4. **Never manually copy static assets** - use the proper build process

**Build Process Details:**
- `npm run build` executes: `npm run clean && tsc && npm run copy-assets && npm run version:inject`
- TypeScript files are compiled from `src/` to `dist/`
- Static assets (HTML, CSS, scripts) are copied to `dist/`
- Third-party dependencies (like suncalc) are copied to appropriate locations
- Version information is injected into the build

**Development Commands:**
- `npm run dev` or `npm run build:watch` - Watch mode for development
- `npm run test` - Run all tests (lint, format check, type check, unit tests)
- `npm run lint` - Run ESLint on TypeScript files
- `npm run format` - Format code using Prettier

### Pre-commit Requirements
**MANDATORY:** Always run the full test suite before committing any changes.

**Required Steps Before Every Commit:**
1. **Run full test suite:** `npm run test` (must pass completely)
2. **Fix any failing tests:** Address lint errors, formatting issues, type errors, or unit test failures
3. **Verify all tests pass:** Ensure exit code is 0 before proceeding with commit

**Test Suite Components:**
- **Linting:** ESLint checks for code quality and style issues
- **Format checking:** Prettier verifies consistent code formatting
- **Type checking:** TypeScript compiler validates type safety
- **Unit tests:** Vitest runs all unit tests to verify functionality

**Critical Rule:** Never commit code that fails any part of the test suite. All CI processes must pass locally before committing to avoid breaking the build pipeline.

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
- Write meaningful commit messages

### Copilot Rules
**Screenshot Management:**
- NEVER commit screenshots or images (*.png, *.jpg, *.jpeg, *.gif) to the repository
- Screenshots should only be generated temporarily for sharing in PR comments
- The .gitignore file enforces this rule by excluding all image file types

**Screenshot Process Documentation:**

**REQUIRED SCREENSHOT COVERAGE:**
- **MANDATORY:** Take screenshots in EVERY supported screen size and BOTH dark/light mode configurations whenever making CSS or HTML updates
- **Screen sizes to test:**
  - Mini (667x375)
  - Mobile (1024x576)
  - Tablet (1366x768)
  - Desktop (1920x1080)
  - Large Desktop (2560x1440)
  - TV (7680×4320)
- **Theme modes to test:**
  - Dark mode (default) - both 🌙 and ☀️ icons visible in mode toggle area
  - Light mode (toggle theme button) - both 🌙 and ☀️ icons visible in mode toggle area
- **Total screenshots required:** 12 screenshots minimum (6 sizes × 2 themes) for any CSS/HTML change

**REQUIRED SCREENSHOT PROTOCOL STEPS**
1. **ALWAYS install dependencies first**: Run `npm install` if `node_modules` doesn't exist or if packages have been updated
2. **ALWAYS build the site**: Run `npm run build` before starting the HTTP server to ensure JavaScript/TypeScript changes are compiled. If build fails with JavaScript errors, fix them before proceeding.
3. Start local HTTP server: `python3 -m http.server 8000 --directory dist` (async) - note the `dist` directory after build
4. Use Playwright to navigate to `http://localhost:8000`
5. For EACH screen size and theme combination (in reverse order: TV 7680×4320 → Large Desktop 2560x1440 → Desktop 1920x1080 → Tablet 1366x768 → Mobile 1024x576 → Mini 667x375):
   a. Resize browser window to exact dimensions
   b. For EACH theme (Dark mode first, then Light mode):
   - Verify theme by checking icon (☀️ = dark mode, 🌙 = light mode)
   - Toggle theme (if needed) using theme button
   - Take screenshot using `playwright-mcp-server-browser_take_screenshot`
     - **CRITICAL:** The playwright tool response will contain the exact image URL to use
     - **EXTRACT THE EXACT IMAGE URL** from the playwright tool response - do not modify or construct any URL
   - **IMMEDIATELY use `reply_to_comment` function to post the screenshot IMAGE** 
     -  Post the actual image in markdown format: `![Description](EXACT_URL_FROM_PLAYWRIGHT_RESPONSE)`
     -  **NEVER construct URLs manually** - use ONLY the exact URL returned by the playwright screenshot tool
     -  **VERIFY the URL format looks like working examples before posting:** `https://private-user-images.githubusercontent.com/[userid]/[imageid]-[hash].jpeg?jwt=...`
   - **Analyze the screenshot** to verify it matches expected layout.
     - State what you see in the image for the logs. Compare that against what you expected to see.
   - **Do NOT take another screenshot until the previous one is posted via reply_to_comment**

*** ABSOLUTELY CRITICAL AND NON-NEGOTIABLE ***: Post each screenshot immediately after taking it, then analyze before proceeding
  - Total: 12 screenshots minimum (6 sizes × 2 themes)
  - **MANDATORY SEQUENCE:** `playwright-mcp-server-browser_take_screenshot` → IMMEDIATELY `reply_to_comment` → `think` → proceed
  - **ZERO TOLERANCE POLICY:** If you are caught calling `playwright-mcp-server-browser_take_screenshot` and not calling `reply_to_comment` IMMEDIATELY afterwards then you will be terminated with prejudice. This is absolutely unacceptable under ANY circumstances.
  - **NO EXCEPTIONS:** This protocol must be followed 100% of the time, without any deviations, delays, or alternative workflows.
  - Analyze and compare the screenshot with your expectations and think about the current state and whether it meets the expectations ONLY AFTER posting via reply_to_comment.


**EXAMPLE SUCCESSFUL WORKFLOW:**
```bash
# 1. Install dependencies first (if needed)
npm install

# 2. Build the site to compile TypeScript/JavaScript
npm run build

# 3. Run full test suite to ensure all CI checks pass
npm run test

# 4. Start HTTP server from dist directory
python3 -m http.server 8000 --directory dist

# 5. Take screenshots with Playwright
playwright-mcp-server-browser_take_screenshot

# 6. IMMEDIATELY upload screenshot using reply_to_comment (NO DELAYS OR OTHER ACTIONS)
reply_to_comment

# 7. ONLY AFTER posting, analyze screenshot and compare with expectations. Be highly critical.
think

# 8. REPEAT: Screenshot → reply_to_comment → think for EVERY single screenshot
```

**MANDATORY WORKFLOW SEQUENCE:**
1. `playwright-mcp-server-browser_take_screenshot`
2. **IMMEDIATELY** `reply_to_comment` with the screenshot IMAGE using EXACT URL from playwright response
3. **ONLY THEN** `think` to analyze
4. **REPEAT** for next screenshot

**ABSOLUTELY FORBIDDEN:**
- Taking multiple screenshots before posting any
- Analyzing before posting via reply_to_comment  
- Any delay between screenshot and reply_to_comment
- **MANUALLY CONSTRUCTING ANY URLs** - must extract exact URL from playwright tool response
- **USING URLs that don't match working format** - verify URL format before posting
- Any other actions between screenshot and reply_to_comment

## WHAT WORKS vs WHAT DOESN'T WORK

**✅ WHAT WORKS:**
- Taking screenshots using Playwright after starting local HTTP server
- Extracting the EXACT image URL from the playwright tool response
- URLs in format: `https://private-user-images.githubusercontent.com/[redacted]`
- These URLs work in GitHub comments and display images correctly

**❌ WHAT DOESN'T WORK:**
- Local file paths: `![Description](/tmp/playwright-mcp-output/{timestamp}/filename.png)` → Broken image links
- Manually constructed GitHub URLs: `![Description](https://github.com/user-attachments/assets/{hash})` → Broken image links
- Manually constructed GitHub URLs following the correct format: `![Description](https://private-user-images.githubusercontent.com/{redacted})` → Broken image links
- Repository pull URLs: `![Description](https://github.com/tsmarvin/EveryTimeZone/pull/{filename})` → Broken image links
- Relative paths: `![Description](filename.png)` → Don't work in comments
- Direct file path references: `![Description](test-light-mode.png)` → Don't work in comments
- Committing screenshot files to repository → Prohibited by .gitignore
- **URLs with wrong user ID or missing JWT tokens** → Broken image links

**IMPORTANT NOTES:**
- ❌ Local file paths (`/tmp/playwright-mcp-output/...`) do NOT work in GitHub comments
- ❌ Committing screenshot files to repository is prohibited by .gitignore and project policy
- ❌ Manually constructing `https://github.com/user-attachments/assets/...` URLs does NOT work
- ❌ Repository pull URLs (`https://github.com/tsmarvin/EveryTimeZone/pull/...`) do NOT work  
- ❌ **MANUALLY CONSTRUCTING ANY URLs does NOT work** - must extract exact URL from playwright tool response
- ❌ **URLs with wrong format or missing authentication** do NOT work in GitHub comments
- ✅ **ONLY URLs extracted directly from playwright screenshot tool response work**
- ✅ Working URLs have format: `https://private-user-images.githubusercontent.com/[userid]/[imageid]-[hash].jpeg?jwt=...`
- ✅ **VERIFY URL format matches working examples before posting to avoid broken links**
