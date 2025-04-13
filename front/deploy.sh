#!/bin/bash

# Build the frontend
echo "Building the frontend..."
npm run build

# Check if the build was successful
if [ $? -ne 0 ]; then
  echo "Build failed. Exiting."
  exit 1
fi

# Deploy to a server or hosting service
# This is a placeholder - replace with your actual deployment commands
echo "Deploying to server..."

# For example, if deploying to a server via SSH:
# rsync -avz --delete dist/ user@server:/path/to/deployment/

# Or if deploying to GitHub Pages:
# npx gh-pages -d dist

echo "Deployment complete!"
