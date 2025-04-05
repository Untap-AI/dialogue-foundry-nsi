#!/bin/bash

# This script builds the backend-smokebox package for Render deployment

echo "Starting build for backend-smokebox..."

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Remove previous build if it exists
rm -rf dist
mkdir -p dist

# Copy backend dist files to our dist directory
echo "Copying backend dist files..."
cp -r ../dist/* dist/

# Prepare the package.json for the dist folder
cp package.json dist/

# We keep the workspace dependency in package.json but the dist folder 
# doesn't have workspace resolution, so it will use the published version

echo "Build completed for backend-smokebox." 