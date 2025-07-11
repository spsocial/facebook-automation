# Quick Start Guide - Facebook Broadcast SaaS

## 🚀 การเริ่มต้นใช้งาน

### 1. Setup Environment

```bash
# Copy environment file
cp .env.example .env

# แก้ไขไฟล์ .env และใส่ค่าต่อไปนี้:
# - FACEBOOK_APP_ID
# - FACEBOOK_APP_SECRET
# - JWT_SECRET (generate random string)
# - WEBHOOK_VERIFY_TOKEN (generate random string)
```

### 2. Start Services

```bash
# Start database services
npm run docker:up

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### 3. Start Development

```bash
# Start both frontend and backend
npm run dev

# หรือแยกกัน:
# Terminal 1: Backend
cd apps/api && npm run dev

# Terminal 2: Frontend
cd apps/web && npm run dev
```

### 4. Access Applications

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **pgAdmin**: http://localhost:5050 (admin@admin.com / admin)

## 📱 Facebook App Setup

### 1. Create Facebook App

1. ไปที่ https://developers.facebook.com
2. สร้าง App ใหม่ เลือก "Business"
3. เพิ่ม Products:
   - Facebook Login
   - Messenger
   - Webhooks

### 2. Configure Facebook Login

1. Settings > Basic:
   - App Domains: `localhost`
   - Privacy Policy URL: `http://localhost:3000/privacy`
   - Terms of Service URL: `http://localhost:3000/terms`

2. Facebook Login > Settings:
   - Valid OAuth Redirect URIs: 
     - `http://localhost:5000/api/auth/facebook/callback`
     - `https://yourapp.railway.app/api/auth/facebook/callback`

### 3. Configure Webhooks

1. Webhooks > Add Callback URL:
   - Callback URL: `https://yourapp.railway.app/api/webhooks/facebook`
   - Verify Token: (same as WEBHOOK_VERIFY_TOKEN in .env)

2. Subscribe to fields:
   - `messages`
   - `messaging_postbacks` 
   - `feed`
   - `mention`

### 4. Required Permissions

ขอ permissions เหล่านี้:
- `pages_show_list`
- `pages_messaging`
- `pages_messaging_subscriptions`
- `pages_read_engagement`
- `pages_manage_metadata`
- `pages_read_user_content`
- `pages_manage_engagement`

## 🧪 Testing

### Test User (ถ้า seed database)
- Email: demo@example.com
- Organization: Demo Company

### Test Facebook Login
1. Click "Login with Facebook"
2. Authorize app
3. Select pages to manage

### Test Broadcast
1. Connect a Facebook Page
2. Create new broadcast
3. Select recipients
4. Send or schedule

### Test Comments
1. Add post to monitor
2. Comment on the Facebook post
3. See comment appear in dashboard
4. Reply from dashboard

## 🚀 Deployment to Railway

### 1. Prepare Repository

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/facebook-broadcast-saas.git
git push -u origin main
```

### 2. Railway Setup

1. Create account at https://railway.app
2. New Project > Deploy from GitHub repo
3. Add PostgreSQL database
4. Add Redis database

### 3. Environment Variables

Set in Railway dashboard:
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
JWT_SECRET=your_jwt_secret
WEBHOOK_VERIFY_TOKEN=your_webhook_token
CLIENT_URL=https://yourapp.railway.app
```

### 4. Deploy

```bash
railway up
```

## 📝 Important Notes

### Development
- ใช้ ngrok สำหรับ test webhooks locally
- Facebook Login ต้องใช้ HTTPS ใน production

### Production
- เปลี่ยน Facebook App เป็น Live Mode
- Setup custom domain
- Enable SSL certificate
- Setup monitoring

### Security
- Encrypt page access tokens ก่อนเก็บ
- ใช้ environment variables สำหรับ secrets
- Enable rate limiting
- Setup CORS properly

## 🆘 Troubleshooting

### Facebook Login ไม่ทำงาน
- ตรวจสอบ App ID และ Secret
- ตรวจสอบ redirect URI
- ดู console errors

### Webhooks ไม่ทำงาน
- ตรวจสอบ verify token
- ดู webhook logs ใน Facebook
- ตรวจสอบ SSL certificate

### Database connection failed
- ตรวจสอบ DATABASE_URL
- ตรวจสอบ PostgreSQL service running
- Run migrations: `npm run db:migrate`

## 📞 Support

หากพบปัญหาหรือต้องการความช่วยเหลือ:
1. ตรวจสอบ logs: `npm run docker:logs`
2. ดู error messages ใน browser console
3. ตรวจสอบ network requests