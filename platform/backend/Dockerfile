# ── Backend Dockerfile ────────────────────────────────
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy source
COPY . .

# Create upload directories
RUN mkdir -p uploads/photos uploads/modules uploads/submissions uploads/certificates

# Expose port
EXPOSE 5000

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
RUN chown -R nodeuser:nodejs /app
USER nodeuser

CMD ["node", "server.js"]
