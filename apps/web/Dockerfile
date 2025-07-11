FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY next.config.js ./
COPY postcss.config.js ./
COPY tailwind.config.ts ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY src ./src
COPY public ./public

# Build Next.js
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]