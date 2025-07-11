# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/database/package*.json ./packages/database/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/database/package*.json ./packages/database/
COPY packages/shared/package*.json ./packages/shared/

# Install production dependencies only
RUN npm ci --production

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy Prisma schema
COPY packages/database/prisma ./packages/database/prisma

EXPOSE 5000

# Start the application
CMD ["node", "apps/api/dist/index.js"]