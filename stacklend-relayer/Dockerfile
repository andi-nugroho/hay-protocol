# Use Node.js LTS Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install pnpm for faster package management
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S relayer -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R relayer:nodejs /app

# Switch to non-root user
USER relayer

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => { \
    process.exit(r.statusCode === 200 ? 0 : 1) \
  }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "dist/index.js"]
