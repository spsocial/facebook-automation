#!/bin/bash

echo "🚀 Setting up Facebook Broadcast SaaS..."

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file from .env.example..."
  cp .env.example .env
  echo "⚠️  Please update .env with your configuration"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Generate Prisma client
echo "🔧 Generating Prisma client..."
cd packages/database
npm run generate
cd ../..

# Run database migrations
echo "📊 Running database migrations..."
cd packages/database
npm run migrate
cd ../..

# Seed database
echo "🌱 Seeding database..."
cd packages/database
npm run seed
cd ../..

echo "✅ Setup complete!"
echo ""
echo "To start the development servers, run:"
echo "  npm run dev"
echo ""
echo "Services:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:5000"
echo "  - PostgreSQL: localhost:5432"
echo "  - pgAdmin: http://localhost:5050 (admin@admin.com / admin)"
echo "  - Redis: localhost:6379"