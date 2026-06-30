-- Phase 13: admin quote monitoring.

ALTER TABLE public.job_quotes
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.job_quotes
DROP CONSTRAINT IF EXISTS job_quotes_status_check;

UPDATE public.job_quotes
SET status = CASE status
  WHEN 'PENDING' THEN 'submitted'
  WHEN 'ACCEPTED' THEN 'accepted'
  WHEN 'DECLINED' THEN 'rejected'
  WHEN 'EXPIRED' THEN 'expired'
  ELSE lower(status)
END;

ALTER TABLE public.job_quotes
ALTER COLUMN status SET DEFAULT 'submitted';

ALTER TABLE public.job_quotes
ADD CONSTRAINT job_quotes_status_check
CHECK (status IN ('submitted', 'reviewed', 'accepted', 'rejected', 'expired', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_job_quotes_metadata_flagged
ON public.job_quotes ((metadata->>'is_flagged'));

CREATE INDEX IF NOT EXISTS idx_job_quotes_metadata_hidden
ON public.job_quotes ((metadata->>'is_hidden'));

DROP POLICY IF EXISTS workers_update_own_quotes ON public.job_quotes;
CREATE POLICY workers_update_own_quotes
ON public.job_quotes
FOR UPDATE
USING (
  worker_profile_id = public.current_approved_worker_profile_id()
  AND status = 'submitted'
)
WITH CHECK (
  worker_profile_id = public.current_approved_worker_profile_id()
);
