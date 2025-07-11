import { z } from 'zod';

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  organizationName: z.string().min(2),
});

// Organization Schemas
export const createOrganizationSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  logoUrl: z.string().url().optional(),
  settings: z.object({
    whiteLabel: z.boolean().optional(),
    customColors: z.object({
      primary: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      secondary: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    }).optional(),
  }).optional(),
});

// Broadcast Schemas
export const createBroadcastSchema = z.object({
  pageId: z.string().uuid(),
  messageText: z.string().min(1).optional(),
  messageAttachments: z.array(z.object({
    type: z.enum(['image', 'video', 'file']),
    url: z.string().url(),
    name: z.string().optional(),
  })).optional(),
  recipientType: z.enum(['all', 'segment', 'individual']),
  recipientIds: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const updateBroadcastSchema = createBroadcastSchema.partial();

// Comment Schemas
export const replyCommentSchema = z.object({
  replyText: z.string().min(1),
  sendToMessenger: z.boolean().default(true),
});

// Post Schemas
export const addMonitoredPostSchema = z.object({
  pageId: z.string().uuid(),
  postUrl: z.string().url().optional(),
  postId: z.string().optional(),
}).refine(data => data.postUrl || data.postId, {
  message: 'Either postUrl or postId must be provided',
});

// Member Schemas
export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']),
  permissions: z.array(z.enum(['broadcast', 'comments', 'analytics', 'billing', 'team', 'settings'])).optional(),
});

export const updateMemberSchema = z.object({
  role: z.enum(['admin', 'member']).optional(),
  permissions: z.array(z.enum(['broadcast', 'comments', 'analytics', 'billing', 'team', 'settings'])).optional(),
});

// Page Schemas
export const connectPageSchema = z.object({
  pageId: z.string(),
  pageName: z.string(),
  pageAccessToken: z.string(),
});

// Pagination Schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Filter Schemas
export const broadcastFilterSchema = z.object({
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'failed']).optional(),
  pageId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const commentFilterSchema = z.object({
  postId: z.string().uuid().optional(),
  isReplied: z.coerce.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Webhook Schema
export const facebookWebhookSchema = z.object({
  object: z.literal('page'),
  entry: z.array(z.object({
    id: z.string(),
    time: z.number(),
    changes: z.array(z.object({
      field: z.string(),
      value: z.any(),
    })),
  })),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type CreateBroadcastInput = z.infer<typeof createBroadcastSchema>;
export type UpdateBroadcastInput = z.infer<typeof updateBroadcastSchema>;
export type ReplyCommentInput = z.infer<typeof replyCommentSchema>;
export type AddMonitoredPostInput = z.infer<typeof addMonitoredPostSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ConnectPageInput = z.infer<typeof connectPageSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type BroadcastFilterInput = z.infer<typeof broadcastFilterSchema>;
export type CommentFilterInput = z.infer<typeof commentFilterSchema>;
export type FacebookWebhookInput = z.infer<typeof facebookWebhookSchema>;