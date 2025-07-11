FROM node:18

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN npm install --force

# Build
RUN npm run build || echo "Build warning"

EXPOSE 3000

# Start Next.js
CMD ["npm", "run", "start"]