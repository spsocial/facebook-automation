FROM node:18-alpine

WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache libc6-compat

# Copy all files from web directory
COPY . .

# Install dependencies
RUN npm install

# Build Next.js
RUN npm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=0 /app/public ./public
COPY --from=0 /app/.next/standalone ./
COPY --from=0 /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]