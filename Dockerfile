# Single stage build
FROM node:18-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy all files
COPY . .

# Install all dependencies
RUN npm install

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

EXPOSE 5000

# Start the application
CMD ["node", "apps/api/dist/index.js"]