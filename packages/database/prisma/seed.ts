import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create demo organization
  const demoOrg = await prisma.organization.create({
    data: {
      name: 'Demo Company',
      slug: 'demo',
      plan: 'professional',
      status: 'active',
      settings: {
        features: {
          broadcast: true,
          comments: true,
          analytics: true,
        },
      },
    },
  });

  // Create demo user
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      name: 'Demo User',
      facebookId: '123456789',
      avatarUrl: 'https://ui-avatars.com/api/?name=Demo+User',
    },
  });

  // Create organization membership
  await prisma.organizationMember.create({
    data: {
      organizationId: demoOrg.id,
      userId: demoUser.id,
      role: 'owner',
      permissions: ['broadcast', 'comments', 'analytics', 'billing', 'team', 'settings'],
    },
  });

  // Create sample subscription
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  await prisma.subscription.create({
    data: {
      organizationId: demoOrg.id,
      plan: 'professional',
      status: 'active',
      amount: 899,
      currency: 'THB',
      billingCycle: 'monthly',
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
    },
  });

  // Create usage tracking for current month
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  await prisma.usageTracking.create({
    data: {
      organizationId: demoOrg.id,
      month: currentMonth,
      broadcastsSent: 0,
      commentsProcessed: 0,
      pagesConnected: 0,
      teamMembers: 1,
    },
  });

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });