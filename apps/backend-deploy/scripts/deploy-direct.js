#!/usr/bin/env node

/**
 * Direct Deployment Script for Render
 * 
 * This script deploys directly to Render without requiring an S3 publication step.
 * Usage: node deploy-direct.js <environment> [version]
 * 
 * Examples:
 *   node deploy-direct.js smokebox
 *   node deploy-direct.js production 1.2.3
 */

require('dotenv').config();
const https = require('https');

// Parse command line arguments
const environment = process.argv[2];
const version = process.argv[3] || 'latest';

// Validate environment parameter
if (!environment || (environment !== 'smokebox' && environment !== 'production')) {
  console.error('Error: Please specify a valid environment (smokebox or production)');
  process.exit(1);
}

// Get environment variables
const RENDER_API_KEY = process.env.RENDER_API_KEY;
const RENDER_SMOKEBOX_ID = process.env.RENDER_SMOKEBOX_ID;
const RENDER_PROD_ID = process.env.RENDER_PROD_ID;

// Validate required environment variables
if (!RENDER_API_KEY) {
  console.error('Error: RENDER_API_KEY environment variable is missing');
  process.exit(1);
}

// Determine the service ID based on environment
const serviceId = environment === 'smokebox' ? RENDER_SMOKEBOX_ID : RENDER_PROD_ID;

if (!serviceId) {
  console.error(`Error: RENDER_${environment.toUpperCase()}_ID environment variable is missing`);
  process.exit(1);
}

console.log(`Initiating direct deployment to ${environment} environment...`);

// For production with a specified version, update the environment variable first
if (environment === 'production' && version !== 'latest') {
  console.log(`Setting backend version to: ${version}`);
  
  // Request options for updating the environment variable
  const updateOptions = {
    hostname: 'api.render.com',
    path: `/v1/services/${serviceId}/env-vars`,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${RENDER_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  // Create the request body for updating the environment variable
  const updateBody = JSON.stringify({
    envVars: [
      {
        key: 'BACKEND_VERSION',
        value: version
      }
    ]
  });

  // Make the request to update the environment variable
  const updateRequest = https.request(updateOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('Backend version updated successfully');
        triggerDeploy();
      } else {
        console.error(`Failed to update environment variable: ${res.statusCode}`);
        console.error(data);
        process.exit(1);
      }
    });
  });

  updateRequest.on('error', (error) => {
    console.error('Error updating environment variable:', error);
    process.exit(1);
  });

  updateRequest.write(updateBody);
  updateRequest.end();
} else {
  // For smokebox or production with latest version, go straight to deployment
  triggerDeploy();
}

// Function to trigger the deployment
function triggerDeploy() {
  console.log(`Triggering ${environment} deployment...`);

  // Build the deploy request options
  const deployOptions = {
    hostname: 'api.render.com',
    path: `/v1/services/${serviceId}/deploys`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RENDER_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  // Make the request to trigger the deployment
  const deployRequest = https.request(deployOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log(`${environment} deployment response status: ${res.statusCode}`);
      console.log(data);
      
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`${environment} deployment successfully triggered`);
      } else {
        console.error(`Failed to trigger ${environment} deployment`);
        process.exit(1);
      }
    });
  });

  deployRequest.on('error', (error) => {
    console.error('Error triggering deployment:', error);
    process.exit(1);
  });

  deployRequest.end();
} 