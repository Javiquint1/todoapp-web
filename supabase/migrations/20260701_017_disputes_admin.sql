ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.disputes
  ALTER COLUMN status SET DEFAULT 'open';

ALTER TABLE public.disputes
  DROP CONSTRAINT IF EXISTS disputes_status_check,
  DROP CONSTRAINT IF EXISTS disputes_type_check;

UPDATE public.disputes
SET
  status = CASE status
    WHEN 'OPEN' THEN 'open'
    WHEN 'UNDER_REVIEW' THEN 'under_review'
    WHEN 'RESOLVED' THEN 'resolved'
    WHEN 'REJECTED' THEN 'rejected'
    ELSE lower(status)
  END,
  type = CASE type
    WHEN 'QUALITY' THEN 'incomplete_work'
    WHEN 'PAYMENT' THEN 'payment_issue'
    WHEN 'NO_SHOW' THEN 'no_show'
    WHEN 'SAFETY' THEN 'unsafe_behavior'
    WHEN 'PROPERTY_DAMAGE' THEN 'damage_reported'
    WHEN 'OTHER' THEN 'other'
    ELSE COALESCE(lower(type), 'other')
  END;

ALTER TABLE public.disputes
  ADD CONSTRAINT disputes_status_check CHECK (
    status IN (
      'open',
      'under_review',
      'waiting_for_customer',
      'waiting_for_worker',
      'resolved',
      'rejected',
      'escalated',
      'closed'
    )
  ),
  ADD CONSTRAINT disputes_type_check CHECK (
    type IN (
      'no_show',
      'incomplete_work',
      'damage_reported',
      'payment_issue',
      'unsafe_behavior',
      'price_disagreement',
      'other'
    )
  );

CREATE TABLE IF NOT EXISTS public.dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  uploaded_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_url text NOT NULL,
  file_type text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_type ON public.disputes(type);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON public.dispute_evidence(dispute_id);

CREATE TRIGGER trg_dispute_evidence_updated_at
BEFORE UPDATE ON public.dispute_evidence
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_admins_on_dispute_evidence ON public.dispute_evidence;
CREATE POLICY allow_admins_on_dispute_evidence
ON public.dispute_evidence
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());
