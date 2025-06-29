-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create schema for our tables
CREATE SCHEMA IF NOT EXISTS public;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table extension (for additional fields)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium_basic', 'premium_plus', 'b2b')),
    subscription_end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_user FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Topics table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subject TEXT NOT NULL CHECK (subject IN ('mathematics', 'physics')),
    content TEXT NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    category TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Progress table with detailed analytics
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    topic_id UUID REFERENCES public.topics NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    time_spent INTEGER, -- in seconds
    last_activity TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- AI Chat Sessions table with automatic cleanup
CREATE TABLE IF NOT EXISTS public.ai_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    topic_id UUID REFERENCES public.topics,
    content TEXT NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Auto-delete after 3 months for GDPR compliance
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '3 months')
);

-- Payment History table
CREATE TABLE IF NOT EXISTS public.payment_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
    provider TEXT NOT NULL CHECK (provider IN ('stripe', 'tripay')),
    provider_payment_id TEXT,
    subscription_tier TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_topics_slug ON public.topics(slug);
CREATE INDEX idx_user_progress_user ON public.user_progress(user_id);
CREATE INDEX idx_ai_sessions_user ON public.ai_sessions(user_id);
CREATE INDEX idx_ai_sessions_expires ON public.ai_sessions(expires_at);
CREATE INDEX idx_payment_history_user ON public.payment_history(user_id);

-- Row Level Security Policies

-- Topics: Anyone can read, only admins can modify
CREATE POLICY topics_select ON public.topics FOR SELECT USING (true);
CREATE POLICY topics_insert ON public.topics FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);
CREATE POLICY topics_update ON public.topics FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- User Progress: Users can only see and modify their own progress
CREATE POLICY progress_select ON public.user_progress 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY progress_insert ON public.user_progress 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY progress_update ON public.user_progress 
    FOR UPDATE USING (auth.uid() = user_id);

-- AI Sessions: Users can only access their own chat history
CREATE POLICY ai_sessions_select ON public.ai_sessions 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ai_sessions_insert ON public.ai_sessions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payment History: Users can only see their own payments
CREATE POLICY payment_select ON public.payment_history 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY payment_insert ON public.payment_history 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to clean up expired AI sessions
CREATE OR REPLACE FUNCTION cleanup_expired_ai_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM public.ai_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup every day
SELECT cron.schedule(
    'cleanup-ai-sessions',
    '0 0 * * *', -- Run at midnight every day
    'SELECT cleanup_expired_ai_sessions();'
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables that need updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON public.topics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON public.user_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_history_updated_at
    BEFORE UPDATE ON public.payment_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
