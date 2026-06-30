-- Phase 11: service request admin management.

ALTER TABLE public.service_requests
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.service_requests
DROP CONSTRAINT IF EXISTS service_requests_status_check;

UPDATE public.service_requests
SET status = CASE status
  WHEN 'OPEN' THEN 'requested'
  WHEN 'PENDING' THEN 'reviewing'
  WHEN 'ASSIGNED' THEN 'assigned'
  WHEN 'ACCEPTED' THEN 'accepted'
  WHEN 'COMPLETED' THEN 'completed'
  WHEN 'CANCELLED' THEN 'cancelled'
  ELSE lower(status)
END;

ALTER TABLE public.service_requests
ALTER COLUMN status SET DEFAULT 'requested';

ALTER TABLE public.service_requests
ADD CONSTRAINT service_requests_status_check
CHECK (
  status IN (
    'requested',
    'reviewing',
    'assigned',
    'quoted',
    'accepted',
    'scheduled',
    'in_progress',
    'completed',
    'disputed',
    'cancelled',
    'closed'
  )
);

CREATE INDEX IF NOT EXISTS idx_service_requests_metadata_urgency
ON public.service_requests ((metadata->>'urgency'));
