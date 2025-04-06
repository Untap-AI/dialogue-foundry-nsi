FROM node:18-alpine

WORKDIR /app

# The ENVIRONMENT argument defaults to smokebox but can be set to production
ARG ENVIRONMENT=smokebox
ARG BACKEND_VERSION=latest

# Copy package files
COPY package.json ./

# Install pnpm
RUN npm install -g pnpm@9

# Set environment variables
ENV NODE_ENV=production
ENV DEPLOYMENT_ENV=$ENVIRONMENT
ENV BACKEND_VERSION=$BACKEND_VERSION

# Install dependencies
RUN pnpm install --production

# Copy the dist folder that was already built and prepared by the build script
COPY dist ./dist

# Expose the port your app runs on
EXPOSE 8080

# Start the app
CMD ["node", "dist/index.js"] 