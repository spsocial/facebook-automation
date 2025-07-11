# Facebook Broadcast SaaS

A multi-tenant SaaS platform for Facebook Messenger broadcasting, comment management, and analytics.

## Features

- 🔐 **Authentication**: Facebook OAuth and JWT-based authentication
- 📨 **Broadcast Management**: Send messages to Facebook Messenger users
- 💬 **Comment Management**: Monitor and auto-reply to Facebook comments
- 📊 **Analytics Dashboard**: Track broadcast performance and engagement
- 👥 **Multi-tenant**: Support multiple organizations with team management
- 💳 **Subscription Plans**: Starter, Growth, and Enterprise plans
- 🚀 **Real-time Updates**: WebSocket support for live updates

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, MUI
- **Backend**: Express.js, TypeScript, Prisma
- **Database**: PostgreSQL
- **Queue**: Redis + Bull
- **Monorepo**: Turborepo
- **Deployment**: Railway

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (optional for development)
- Facebook App with required permissions

### Installation

1. Clone the repository:
```bash
git clone https://github.com/spsocial/facebook-automation.git
cd facebook-automation
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
```

4. Generate Prisma client:
```bash
npm run db:generate
```

5. Run database migrations:
```bash
npm run db:push
```

6. Start development servers:
```bash
npm run dev
```

### Environment Variables

#### API (.env)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string (optional)
- `JWT_SECRET`: Secret for JWT tokens
- `FACEBOOK_APP_ID`: Your Facebook App ID
- `FACEBOOK_APP_SECRET`: Your Facebook App Secret
- `FACEBOOK_CALLBACK_URL`: OAuth callback URL

#### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL`: API server URL
- `NEXT_PUBLIC_FACEBOOK_APP_ID`: Facebook App ID

## Deployment on Railway

1. Push to GitHub
2. Connect Railway to your GitHub repository
3. Add environment variables in Railway dashboard
4. Deploy!

## License

MIT