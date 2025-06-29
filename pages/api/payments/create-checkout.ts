import { NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware/auth';
import { AuthenticatedRequest } from '@/types/api';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const SUBSCRIPTION_PRICES = {
  premium_basic: process.env.STRIPE_PREMIUM_BASIC_PRICE_ID,
  premium_plus: process.env.STRIPE_PREMIUM_PLUS_PRICE_ID,
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tier } = req.body;
    const userId = req.user.id;

    if (!tier || !SUBSCRIPTION_PRICES[tier as keyof typeof SUBSCRIPTION_PRICES]) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: SUBSCRIPTION_PRICES[tier as keyof typeof SUBSCRIPTION_PRICES],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-failed`,
      customer_email: req.body.email,
      metadata: {
        userId,
        tier,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      locale: 'id', // Indonesian locale
      payment_method_options: {
        card: {
          setup_future_usage: 'off',
        },
      },
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Payment session creation error:', error);
    return res.status(500).json({
      error: 'Failed to create payment session',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}

export default withAuth(handler);
