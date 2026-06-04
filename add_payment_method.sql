-- Migration: Add payment_method column to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_method TEXT;
