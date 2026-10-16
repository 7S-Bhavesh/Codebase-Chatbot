# Use Node 22 with build tools for tree-sitter native modules
FROM node:22-alpine

# Install build dependencies required by tree-sitter native addons
RUN apk add --no-cache python3 make g++ git

# Create app directory
WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Install all dependencies including native addons
RUN npm ci --omit=dev

# Copy the rest of the private server code
COPY . .

# Start the worker
CMD ["node", "src/index.js"]
