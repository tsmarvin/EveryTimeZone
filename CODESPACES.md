# Codespaces Development Guide

## Automatic Setup

This repository is configured for GitHub Codespaces development. When you open the repository in Codespaces, it will automatically:

1. Set up a Node.js 22.x LTS development environment
2. Install all project dependencies (`npm install`)
3. Build the project (`npm run build`)
4. Configure VS Code with TypeScript, ESLint, Prettier, and Live Server extensions
5. Forward ports 3000 and 8000 for development servers

## Quick Start

Once your Codespace is ready:

```bash
# Start the development server (builds and serves on port 8000)
./dev-server.sh
```

The site will be available through the forwarded port. Look for the port forwarding notification in VS Code.

## Codespaces-Specific Features

### Pre-configured Extensions
- TypeScript language support with IntelliSense
- ESLint for real-time code linting
- Prettier for automatic code formatting
- Live Server for development
- JSON support for configuration files

### Port Forwarding
- **Port 3000**: Reserved for development servers
- **Port 8000**: HTTP server for the built site (used by `./dev-server.sh`)

### Editor Settings
- Format on save enabled
- ESLint auto-fix on save
- TypeScript import preferences set to relative paths

## Troubleshooting

### Environment Issues
If the Codespace setup fails:
1. Check the container is using Node.js 22.x
2. Restart the Codespace if dependencies fail to install
3. Run `npm install` manually if needed

### Port Access Problems
If forwarded ports aren't accessible:
1. Check the "Ports" tab in VS Code
2. Ensure ports are set to "Public" visibility
3. Look for browser notifications about port forwarding

For detailed development instructions, build commands, and contribution guidelines, see the main [README.md](README.md).