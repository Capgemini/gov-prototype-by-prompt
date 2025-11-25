# Use Node.js 20 LTS as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --ignore-scripts --omit=dev

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -D -G nodejs -u 1001 nodejs

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application using tsx
CMD ["npx", "--yes", "tsx", "--require", "./src/instrumentation.ts", "server.ts"]
