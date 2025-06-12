-- Migration: Referral Program Tables

-- Table to store unique referral codes for elite users
CREATE TABLE IF NOT EXISTS public.referral_codes (
    referrer_id INTEGER PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    code VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table to record each successful referral (a referred user who signed up)
CREATE TABLE IF NOT EXISTS public.referrals (
    id SERIAL PRIMARY KEY,
    referrer_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    referred_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(referrer_id, referred_id)
);
