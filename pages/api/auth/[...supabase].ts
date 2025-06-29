import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createMiddlewareSupabaseClient({ req, res });

  // Handle Supabase Auth requests
  try {
    if (req.method === 'POST') {
      const { event, session } = req.body;

      switch (event) {
        case 'SIGNED_IN':
          // Create user profile if it doesn't exist
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!profile) {
            await supabase.from('user_profiles').insert({
              id: session.user.id,
              role: 'student',
              subscription_tier: 'free',
              created_at: new Date().toISOString()
            });
          }
          break;

        case 'SIGNED_OUT':
          // Clean up any user-specific data if needed
          break;

        default:
          return res.status(400).json({ error: 'Unsupported auth event' });
      }

      return res.status(200).json({ message: 'Auth event processed' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Auth handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
