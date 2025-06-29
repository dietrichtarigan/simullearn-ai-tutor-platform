import { NextApiResponse } from 'next';
import OpenAI from 'openai';
import { withAuth } from '@/lib/middleware/auth';
import { redis, rateLimiters, chatStorage } from '@/lib/redis';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest, ChatError, TokenLimits, ChatMessage } from '@/types/api';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Token limits per subscription tier
const TOKEN_LIMITS: TokenLimits = {
  free: 2000,
  premium_basic: 10000,
  premium_plus: 50000,
  b2b: 100000
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, topic_id } = req.body;
    const userId = req.user.id;
    const subscription = req.user.subscription;

    // Check rate limits based on subscription tier
    try {
      const limiter = rateLimiters.tutorChat[subscription];
      if (!limiter) {
        throw new Error(`Invalid subscription tier: ${subscription}`);
      }
      await limiter.consume(userId);
    } catch (error) {
      const chatError = error as ChatError;
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: chatError.msBeforeNext ? chatError.msBeforeNext / 1000 : 60,
      });
    }

    // Get chat history
    const history = await chatStorage.getHistory(userId);
    
    // Check token usage
    const dailyTokens = await chatStorage.getDailyTokenUsage(userId);
    const maxTokens = TOKEN_LIMITS[subscription];

    if (dailyTokens >= maxTokens) {
      return res.status(429).json({
        error: 'Daily token limit exceeded',
        limit: maxTokens,
        used: dailyTokens,
      });
    }

    // Prepare messages for OpenAI
    const systemMessage: ChatCompletionMessageParam = {
      role: 'system',
      content: `You are a knowledgeable and patient tutor specializing in high school mathematics and physics. 
               Your goal is to help students understand concepts deeply through clear explanations and guided problem-solving.
               Always break down complex topics into simpler parts and use analogies when helpful.
               If a student seems confused, try explaining the concept in a different way.
               Encourage critical thinking by asking probing questions.`
    };

    const historyMessages: ChatCompletionMessageParam[] = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const userMessage: ChatCompletionMessageParam = {
      role: 'user',
      content: message
    };

    // Get response from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [systemMessage, ...historyMessages, userMessage],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Save message and update token usage
    await chatStorage.saveMessage(userId, message, tokensUsed);
    
    // Save to Supabase for long-term storage
    await supabase.from('ai_sessions').insert({
      user_id: userId,
      topic_id,
      content: message,
      response,
      tokens_used: tokensUsed,
    });

    return res.status(200).json({
      response,
      tokensUsed,
      dailyTokens: dailyTokens + tokensUsed,
      maxTokens,
    });

  } catch (error) {
    console.error('Tutor chat error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

// Apply auth middleware
export default withAuth(handler);
