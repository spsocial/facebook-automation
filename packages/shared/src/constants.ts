export const PLANS = {
  starter: {
    name: 'Starter',
    price: 299,
    limits: {
      pages: 1,
      broadcasts: 1000,
      teamMembers: 3,
      commentsPerMonth: 5000,
    },
    features: [
      'broadcast',
      'comments',
      'basicAnalytics',
    ],
  },
  professional: {
    name: 'Professional',
    price: 899,
    limits: {
      pages: 5,
      broadcasts: 10000,
      teamMembers: 10,
      commentsPerMonth: 50000,
    },
    features: [
      'broadcast',
      'comments',
      'advancedAnalytics',
      'api',
      'customBranding',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 2499,
    limits: {
      pages: -1, // unlimited
      broadcasts: -1,
      teamMembers: -1,
      commentsPerMonth: -1,
    },
    features: [
      'broadcast',
      'comments',
      'advancedAnalytics',
      'api',
      'customBranding',
      'whiteLabel',
      'prioritySupport',
      'customDomain',
    ],
  },
} as const;

export const FACEBOOK_PERMISSIONS = [
  'pages_show_list',
  'pages_messaging',
  'pages_messaging_subscriptions',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_read_user_content',
  'pages_manage_engagement',
  'public_profile',
  'email',
];

export const WEBHOOK_EVENTS = {
  PAGE_MESSAGES: 'messages',
  PAGE_FEED: 'feed',
  PAGE_MENTION: 'mention',
} as const;

export const RATE_LIMITS = {
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
  broadcast: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each org to 10 broadcasts per hour
  },
} as const;

export const ERROR_CODES = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Organization errors
  ORG_NOT_FOUND: 'ORG_NOT_FOUND',
  ORG_SUSPENDED: 'ORG_SUSPENDED',
  ORG_LIMIT_EXCEEDED: 'ORG_LIMIT_EXCEEDED',
  
  // Subscription errors
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',
  
  // Facebook errors
  FACEBOOK_API_ERROR: 'FACEBOOK_API_ERROR',
  PAGE_NOT_CONNECTED: 'PAGE_NOT_CONNECTED',
  INVALID_PAGE_TOKEN: 'INVALID_PAGE_TOKEN',
  
  // General errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const QUEUE_NAMES = {
  BROADCAST: 'broadcast-queue',
  COMMENT_FORWARD: 'comment-forward-queue',
  WEBHOOK: 'webhook-queue',
  EMAIL: 'email-queue',
} as const;

export const JOB_TYPES = {
  SEND_BROADCAST: 'send-broadcast',
  FORWARD_COMMENT: 'forward-comment',
  PROCESS_WEBHOOK: 'process-webhook',
  SEND_EMAIL: 'send-email',
} as const;