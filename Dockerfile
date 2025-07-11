FROM node:18

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN npm install || npm install --force

# Try to generate Prisma
RUN cd packages/database && npx prisma generate || echo "Prisma generate failed"

# Try to build
RUN npm run build || echo "Build failed"

# If TypeScript build failed, just run the source
WORKDIR /app/apps/api

EXPOSE 5000

# Try compiled version first, fallback to ts-node
CMD ["sh", "-c", "node dist/index.js || npx ts-node src/index.ts"]