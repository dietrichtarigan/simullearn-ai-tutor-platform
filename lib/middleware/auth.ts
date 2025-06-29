import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { redis, rateLimiters } from '../redis';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Types
export type UserRole = 'student' | 'teacher' | 'admin';
export type SubscriptionTier = 'free' | 'premium_basic' | 'premium_plus' | 'b2b';

interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: string;
    role: UserRole;
    subscription: SubscriptionTier;
  };
}

// Middleware to check authentication
export const withAuth = (handler: any) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // Get JWT from request header
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Missing authentication token' });
      }

      // Verify token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid authentication token' });
      }

      // Get user profile with role and subscription
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, subscription_tier, subscription_end_date')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return res.status(401).json({ error: 'User profile not found' });
      }

      // Check if subscription is expired
      if (profile.subscription_end_date && new Date(profile.subscription_end_date) < new Date()) {
        // Downgrade to free tier
        await supabase
          .from('user_profiles')
          .update({ subscription_tier: 'free' })
          .eq('id', user.id);
        profile.subscription_tier = 'free';
      }

      // Attach user info to request
      req.user = {
        id: user.id,
        role: profile.role as UserRole,
        subscription: profile.subscription_tier as SubscriptionTier
      };

      // Continue to handler
      return handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Middleware to check role
export const withRole = (allowedRoles: UserRole[]) => {
  return (handler: any) => {
    return async (req: AuthenticatedRequest, res: NextApiResponse) => {
      try {
        // First run auth middleware
        return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
          // Check if user's role is allowed
          if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
              error: 'Unauthorized: Insufficient permissions' 
            });
          }
          
          // Continue to handler
          return handler(req, res);
        })(req, res);
      } catch (error) {
        console.error('Role middleware error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    };
  };
};

// Middleware to check subscription
export const withSubscription = (requiredTier: SubscriptionTier) => {
  return (handler: any) => {
    return async (req: AuthenticatedRequest, res: NextApiResponse) => {
      try {
        // First run auth middleware
        return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
          // Define tier hierarchy
          const tiers: SubscriptionTier[] = ['free', 'premium_basic', 'premium_plus', 'b2b'];
          const requiredTierIndex = tiers.indexOf(requiredTier);
          const userTierIndex = tiers.indexOf(req.user.subscription);

          // Check if user's tier is sufficient
          if (userTierIndex < requiredTierIndex) {
            return res.status(403).json({ 
              error: 'Unauthorized: Premium feature',
              requiredTier 
            });
          }
          
          // Continue to handler
          return handler(req, res);
        })(req, res);
      } catch (error) {
        console.error('Subscription middleware error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    };
  };
};

// Middleware to apply rate limiting
export const withRateLimit = (type: 'tutorChat' | 'api') => {
  return (handler: any) => {
    return async (req: AuthenticatedRequest, res: NextApiResponse) => {
      try {
        // First run auth middleware
        return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
          // Get appropriate rate limiter based on subscription for tutor chat
          const rateLimiter = type === 'tutorChat' 
            ? rateLimiters.tutorChat[req.user.subscription]
            : rateLimiters.api;

          try {
            // Check rate limit
            await rateLimiter.consume(req.user.id);
            
            // Continue to handler
            return handler(req, res);
          } catch (error) {
            // Rate limit exceeded
            return res.status(429).json({ 
              error: 'Rate limit exceeded',
              retryAfter: error.msBeforeNext / 1000
            });
          }
        })(req, res);
      } catch (error) {
        console.error('Rate limit middleware error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    };
  };
};

// Example usage:
/*
export default withRateLimit('api')(
  withRole(['admin'])(
    withSubscription('premium_plus')(
      async (req: AuthenticatedRequest, res: NextApiResponse) => {
        // Your API route handler here
      }
    )
  )
);
*/
