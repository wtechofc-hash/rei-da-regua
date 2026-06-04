-- Migration: Add online payment details to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS mercado_pago_payment_id TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS mercado_pago_preference_id TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_provider TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
