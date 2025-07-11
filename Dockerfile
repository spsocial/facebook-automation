FROM node:18-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace package files
COPY apps/api/package*.json ./apps/api/
COPY packages/database/package*.json ./packages/database/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm install

# Copy source files
COPY apps/api ./apps/api
COPY packages ./packages

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build only what we need
RUN cd packages/database && npm run build || true
RUN cd packages/shared && npm run build || true  
RUN cd apps/api && npm run build

WORKDIR /app/apps/api

EXPOSE 5000

CMD ["node", "dist/index.js"]