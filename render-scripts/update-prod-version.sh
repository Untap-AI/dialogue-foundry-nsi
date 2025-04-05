#!/bin/bash

# This script updates the BACKEND_VERSION environment variable in Render
# to deploy a new version of the backend to production

# Usage: ./update-prod-version.sh <version> <render_api_key>
# Example: ./update-prod-version.sh 1.2.3 rnd_xyz123

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <version> <render_api_key>"
    exit 1
fi

VERSION=$1
RENDER_API_KEY=$2
SERVICE_ID="srv-your-production-service-id" # Replace with your actual Render service ID

echo "Updating production backend version to $VERSION..."

# Update the environment variable using Render API
curl -X PATCH \
  "https://api.render.com/v1/services/$SERVICE_ID/env-vars" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"envVars\": [
      {
        \"key\": \"BACKEND_VERSION\",
        \"value\": \"$VERSION\"
      }
    ]
  }"

echo "Version updated. Deploy the production service in Render dashboard to apply changes." 