ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.jobs
  ALTER COLUMN status SET DEFAULT 'accepted';

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_status_check;

UPDATE public.jobs
SET status = CASE
  WHEN status = 'SCHEDULED' THEN 'scheduled'
  WHEN status = 'IN_PROGRESS' THEN 'in_progress'
  WHEN status = 'COMPLETED' THEN 'approved_by_customer'
  WHEN status = 'CANCELLED' THEN 'cancelled'
  WHEN status = 'DISPUTED' THEN 'disputed'
  ELSE lower(status)
END;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_status_check CHECK (
    status IN (
      'accepted',
      'scheduled',
      'worker_on_the_way',
      'in_progress',
      'completed_by_worker',
      'approved_by_customer',
      'disputed',
      'cancelled',
      'closed'
    )
  );

CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_profile_id ON public.jobs(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_jobs_worker_profile_id ON public.jobs(worker_profile_id);
CREATE INDEX IF NOT EXISTS idx_jobs_metadata_admin_override ON public.jobs((metadata->>'last_admin_override_at'));
