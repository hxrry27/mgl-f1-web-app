FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for next)
RUN npm ci --legacy-peer-deps

# Copy application files
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port
EXPOSE 3100

# Use node directly to run the built app
CMD ["npx", "next", "start", "-p", "3100"]