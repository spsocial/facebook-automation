import cron from 'node-cron';
import prisma from '@repo/database';
import { getBroadcastQueue } from './queue';
import { logger } from '../utils/logger';

export const initializeScheduler = async () => {
  // Check scheduled broadcasts every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find broadcasts that should be sent now
      const scheduledBroadcasts = await prisma.broadcast.findMany({
        where: {
          status: 'scheduled',
          scheduledAt: {
            lte: now,
          },
        },
        include: {
          page: {
            select: {
              organizationId: true,
            },
          },
        },
      });

      logger.debug(`Found ${scheduledBroadcasts.length} broadcasts to send`);

      // Queue each broadcast
      for (const broadcast of scheduledBroadcasts) {
        await getBroadcastQueue().add('send-broadcast', {
          broadcastId: broadcast.id,
          organizationId: broadcast.page.organizationId,
        });

        // Update status to prevent re-queuing
        await prisma.broadcast.update({
          where: { id: broadcast.id },
          data: { status: 'sending' },
        });
      }
    } catch (error) {
      logger.error('Error in broadcast scheduler:', error);
    }
  });

  // Daily usage tracking consolidation
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Running daily usage tracking consolidation...');
      
      // Get yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      // Count actual usage from database
      const organizations = await prisma.organization.findMany({
        where: { status: 'active' },
      });

      for (const org of organizations) {
        const currentMonth = new Date().toISOString().slice(0, 7);

        // Count actual data
        const [broadcasts, comments, pages, members] = await Promise.all([
          prisma.broadcast.count({
            where: {
              organizationId: org.id,
              createdAt: {
                gte: new Date(`${currentMonth}-01`),
              },
            },
          }),
          prisma.comment.count({
            where: {
              organizationId: org.id,
              createdAt: {
                gte: new Date(`${currentMonth}-01`),
              },
            },
          }),
          prisma.facebookPage.count({
            where: {
              organizationId: org.id,
              isActive: true,
            },
          }),
          prisma.organizationMember.count({
            where: {
              organizationId: org.id,
            },
          }),
        ]);

        // Update or create usage tracking
        await prisma.usageTracking.upsert({
          where: {
            organizationId_month: {
              organizationId: org.id,
              month: currentMonth,
            },
          },
          update: {
            broadcastsSent: broadcasts,
            commentsProcessed: comments,
            pagesConnected: pages,
            teamMembers: members,
          },
          create: {
            organizationId: org.id,
            month: currentMonth,
            broadcastsSent: broadcasts,
            commentsProcessed: comments,
            pagesConnected: pages,
            teamMembers: members,
          },
        });
      }

      logger.info('Usage tracking consolidation completed');
    } catch (error) {
      logger.error('Error in usage tracking scheduler:', error);
    }
  });

  // Monthly billing and subscription check
  cron.schedule('0 0 1 * *', async () => {
    try {
      logger.info('Running monthly billing...');
      
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7);

      // Find active subscriptions that need renewal
      const subscriptions = await prisma.subscription.findMany({
        where: {
          status: 'active',
          currentPeriodEnd: {
            lte: now,
          },
        },
        include: {
          organization: true,
        },
      });

      for (const subscription of subscriptions) {
        try {
          // Create invoice
          const invoiceNumber = `INV-${currentMonth}-${subscription.organization.slug}`;
          
          await prisma.invoice.create({
            data: {
              invoiceNumber,
              organizationId: subscription.organizationId,
              amount: subscription.amount,
              currency: subscription.currency,
              status: 'pending',
              dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
              items: [
                {
                  description: `${subscription.plan} Plan - ${currentMonth}`,
                  amount: Number(subscription.amount),
                },
              ],
            },
          });

          // Update subscription period
          const nextPeriodEnd = new Date(subscription.currentPeriodEnd);
          if (subscription.billingCycle === 'monthly') {
            nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
          } else {
            nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
          }

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              currentPeriodStart: subscription.currentPeriodEnd,
              currentPeriodEnd: nextPeriodEnd,
            },
          });

          // TODO: Process payment if auto-charge enabled
          // TODO: Send invoice email

          logger.info(`Created invoice for organization ${subscription.organizationId}`);
        } catch (error) {
          logger.error(`Failed to process billing for subscription ${subscription.id}:`, error);
        }
      }

      // Check trial expirations
      const expiredTrials = await prisma.organization.findMany({
        where: {
          status: 'trial',
          trialEndsAt: {
            lte: now,
          },
        },
      });

      for (const org of expiredTrials) {
        await prisma.organization.update({
          where: { id: org.id },
          data: { status: 'suspended' },
        });

        // TODO: Send trial expiration email
        logger.info(`Trial expired for organization ${org.id}`);
      }

      logger.info('Monthly billing completed');
    } catch (error) {
      logger.error('Error in billing scheduler:', error);
    }
  });

  // Cleanup old data (monthly)
  cron.schedule('0 0 1 * *', async () => {
    try {
      logger.info('Running monthly cleanup...');
      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Clean old broadcasts
      const deletedBroadcasts = await prisma.broadcast.deleteMany({
        where: {
          createdAt: {
            lt: sixMonthsAgo,
          },
          status: {
            in: ['sent', 'failed', 'cancelled'],
          },
        },
      });

      logger.info(`Deleted ${deletedBroadcasts.count} old broadcasts`);

      // Clean old comments
      const deletedComments = await prisma.comment.deleteMany({
        where: {
          createdAt: {
            lt: sixMonthsAgo,
          },
        },
      });

      logger.info(`Deleted ${deletedComments.count} old comments`);
    } catch (error) {
      logger.error('Error in cleanup scheduler:', error);
    }
  });

  logger.info('Scheduler initialized with cron jobs');
};