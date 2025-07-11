FROM node:18-alpine

WORKDIR /app

# Copy only web app files
COPY package*.json ./
COPY next.config.js ./
COPY postcss.config.js ./
COPY tailwind.config.ts ./
COPY tsconfig.json ./

# Copy source
COPY src ./src
COPY public ./public

# Create empty directories for packages (to satisfy imports)
RUN mkdir -p ../../packages/shared/src ../../packages/database
RUN echo "export const ERROR_CODES = {}; export const PLANS = {};" > ../../packages/shared/src/index.ts
RUN echo "export default {}" > ../../packages/database/index.ts

# Install dependencies
RUN npm install --legacy-peer-deps

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]