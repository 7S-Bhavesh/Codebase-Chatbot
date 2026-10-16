# Use lightweight Node.js base image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --omit=dev

# Copy the rest of the private server code
COPY . .

# Expose nothing (internal microservice)
# EXPOSE 4000   <--- ONLY add if your service needs to expose a port

# Start the private server
# Change "server.js" to the actual entry file in your Private server folder
CMD ["node", "src/index.js"]
