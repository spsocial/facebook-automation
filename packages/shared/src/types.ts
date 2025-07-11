export interface User {
  id: string;
  email: string;
  name?: string;
  facebookId?: string;
  avatarUrl?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: PlanType;
  status: OrgStatus;
  trialEndsAt?: Date;
  subscriptionEndsAt?: Date;
  customDomain?: string;
  logoUrl?: string;
  settings: OrgSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: MemberRole;
  permissions: Permission[];
  joinedAt: Date;
  user?: User;
  organization?: Organization;
}

export interface FacebookPage {
  id: string;
  organizationId: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  followersCount: number;
  isActive: boolean;
  connectedById: string;
  connectedAt: Date;
}

export interface Broadcast {
  id: string;
  organizationId: string;
  pageId: string;
  createdById: string;
  messageText?: string;
  messageAttachments: MessageAttachment[];
  recipientType: RecipientType;
  recipientIds: string[];
  scheduledAt?: Date;
  sentAt?: Date;
  status: BroadcastStatus;
  stats: BroadcastStats;
  createdAt: Date;
}

export interface MonitoredPost {
  id: string;
  organizationId: string;
  pageId: string;
  postId: string;
  postUrl?: string;
  postContent?: string;
  isActive: boolean;
  commentCount: number;
  addedById?: string;
  addedAt: Date;
}

export interface Comment {
  id: string;
  organizationId: string;
  postId: string;
  commentId: string;
  parentCommentId?: string;
  commenterId?: string;
  commenterName?: string;
  commentText?: string;
  isForwarded: boolean;
  forwardedAt?: Date;
  isReplied: boolean;
  replyText?: string;
  repliedAt?: Date;
  repliedById?: string;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  organizationId: string;
  plan: PlanType;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelledAt?: Date;
  paymentMethodId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: Date;
  paidAt?: Date;
  paymentMethod?: string;
  items: InvoiceItem[];
  createdAt: Date;
}

export interface UsageTracking {
  id: string;
  organizationId: string;
  month: string;
  broadcastsSent: number;
  commentsProcessed: number;
  pagesConnected: number;
  teamMembers: number;
  updatedAt: Date;
}

// Enums and Types
export type PlanType = 'starter' | 'professional' | 'enterprise';
export type OrgStatus = 'active' | 'suspended' | 'trial';
export type MemberRole = 'owner' | 'admin' | 'member';
export type Permission = 'broadcast' | 'comments' | 'analytics' | 'billing' | 'team' | 'settings';
export type RecipientType = 'all' | 'segment' | 'individual';
export type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';
export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';
export type BillingCycle = 'monthly' | 'yearly';

export interface OrgSettings {
  whiteLabel?: boolean;
  customColors?: {
    primary?: string;
    secondary?: string;
  };
  features?: {
    [key: string]: boolean;
  };
}

export interface MessageAttachment {
  type: 'image' | 'video' | 'file';
  url: string;
  name?: string;
}

export interface BroadcastStats {
  sent: number;
  delivered: number;
  read: number;
  failed?: number;
}

export interface InvoiceItem {
  description: string;
  amount: number;
  quantity?: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth Types
export interface AuthUser {
  user: User;
  organization?: Organization;
  member?: OrganizationMember;
  token: string;
}

export interface JwtPayload {
  userId: string;
  organizationId?: string;
  role?: MemberRole;
  permissions?: Permission[];
}