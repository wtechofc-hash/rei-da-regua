-- Migration: Create abatements and abatement_participants tables

CREATE TABLE IF NOT EXISTS public.abatements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID,
    created_by UUID,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    total_amount NUMERIC NOT NULL,
    distribution_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.abatement_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    abatement_id UUID REFERENCES public.abatements(id) ON DELETE CASCADE,
    participant_type TEXT NOT NULL, -- 'professional' or 'owner'
    participant_id UUID,            -- Can be professional_id or user_id/store_id
    participant_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'quitado', 'cancelado'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security) - or if disable is preferred, we do so, but let's enable and allow all authenticated
ALTER TABLE public.abatements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abatement_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on abatements"
ON public.abatements FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users on abatement_participants"
ON public.abatement_participants FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Anonymous policies in case some client is using anon keys
CREATE POLICY "Allow all operations for anon users on abatements"
ON public.abatements FOR ALL
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations for anon users on abatement_participants"
ON public.abatement_participants FOR ALL
TO anon
USING (true)
WITH CHECK (true);
