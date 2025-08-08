#!/bin/bash

# Development server script for Codespaces
# This script starts a local HTTP server to serve the built site

echo "Starting development server for EveryTimeZone..."

# Build the project first
echo "Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed. Please check the errors above."
    exit 1
fi

echo "Build completed successfully!"

# Start HTTP server
echo "Starting HTTP server on port 8000..."
echo "Access your site at: http://localhost:8000"
echo "In Codespaces, look for the forwarded port notification."
echo ""
echo "Press Ctrl+C to stop the server"

cd dist && python3 -m http.server 8000