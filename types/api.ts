import { NextApiRequest } from 'next';
import { RateLimiterRedis } from 'rate-limiter-flexible';

export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: string;
    role: UserRole;
    subscription: SubscriptionTier;
  };
}

export type UserRole = 'student' | 'teacher' | 'admin';
export type SubscriptionTier = 'free' | 'premium_basic' | 'premium_plus' | 'b2b';

export interface RateLimiters {
  tutorChat: Record<SubscriptionTier, RateLimiterRedis>;
  api: RateLimiterRedis;
}

export interface TokenLimits extends Record<SubscriptionTier, number> {
  free: number;
  premium_basic: number;
  premium_plus: number;
  b2b: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatError extends Error {
  msBeforeNext?: number;
}
