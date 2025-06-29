import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Disable body parsing (use raw body for webhook verification)
export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await buffer(req);
    const signature = req.headers['stripe-signature']!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, tier } = session.metadata || {};

        if (!userId || !tier) {
          throw new Error('Missing user ID or subscription tier in metadata');
        }

        // Update user's subscription in Supabase
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            subscription_tier: tier,
            subscription_end_date: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days from now
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateError) {
          throw new Error(`Failed to update user subscription: ${updateError.message}`);
        }

        // Record payment in payment_history
        const { error: paymentError } = await supabase
          .from('payment_history')
          .insert({
            user_id: userId,
            amount: session.amount_total ? session.amount_total / 100 : 0, // Convert from cents
            currency: session.currency?.toUpperCase() || 'IDR',
            status: 'success',
            provider: 'stripe',
            provider_payment_id: session.payment_intent as string,
            subscription_tier: tier,
          });

        if (paymentError) {
          console.error('Failed to record payment:', paymentError);
          // Don't throw here - we've already updated the subscription
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const { userId } = subscription.metadata || {};

        if (userId) {
          // Downgrade user to free tier
          const { error } = await supabase
            .from('user_profiles')
            .update({
              subscription_tier: 'free',
              subscription_end_date: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (error) {
            throw new Error(`Failed to downgrade user subscription: ${error.message}`);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { userId } = paymentIntent.metadata || {};

        if (userId) {
          // Record failed payment
          const { error } = await supabase
            .from('payment_history')
            .insert({
              user_id: userId,
              amount: paymentIntent.amount / 100, // Convert from cents
              currency: paymentIntent.currency.toUpperCase(),
              status: 'failed',
              provider: 'stripe',
              provider_payment_id: paymentIntent.id,
            });

          if (error) {
            console.error('Failed to record failed payment:', error);
          }
        }
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      error: 'Webhook handler failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}

export default handler;
