FROM node:18-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ openssl openssl-dev

# Copy all files first
COPY . .

# Remove postinstall script temporarily
RUN sed -i '/"postinstall":/d' package.json

# Install dependencies
RUN npm install --legacy-peer-deps

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build packages
RUN cd packages/database && npm run build || true
RUN cd packages/shared && npm run build || true  
RUN cd apps/api && npm run build

WORKDIR /app/apps/api

EXPOSE 5000

CMD ["node", "dist/index.js"]