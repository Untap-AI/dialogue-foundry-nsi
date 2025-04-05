FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install pnpm
RUN npm install -g pnpm@9

# Install dependencies 
RUN pnpm install --production

# Copy the dist folder that was already built and prepared by the build script
COPY dist ./dist

# Expose the port your app runs on
EXPOSE 8080

# Set environment variable to production
ENV NODE_ENV=production

# Start the app
CMD ["node", "dist/index.js"] 