# EveryTimeZone
A static website for visualizing overlapping timezones in an intuitive manner. All site configuration is stored in the URL for easy sharing.

## Features

- Interactive timezone overlap visualization
- URL-based configuration sharing
- Static site hosted on GitHub Pages
- No server required - runs entirely in browser

## Live Site

[View the live application](https://EveryTimeZone.net)

## Development

### Prerequisites
- Node.js (for TypeScript compilation)
- Modern web browser

## Technology Stack

- **Frontend:** HTML, CSS, TypeScript
- **Build:** Node.js toolchain
- **Hosting:** GitHub Pages
- **CI/CD:** GitHub Actions

## Contributing

### Commit Standards
This repository uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#specification). Ex:
```bash
feat: add new timezone selection feature
fix: resolve DST calculation bug
docs: update README with setup instructions
```

### Development Workflow
0. Fork the repository
1. Create feature branch from `main`
2. Make changes
3. Format code
4. Commit code - Ensure commits follow the [convention](https://www.conventionalcommits.org/en/v1.0.0/#specification)
5. Create PR to merge into `main`
6. ???
7. Profit (see your code merged)


## Deployment

GitHub Actions automatically deploys to `gh-pages` branch on merge to `main`. No manual deployment required.

## License
MIT License - see [LICENSE](LICENSE) file for details.
