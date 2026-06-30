-- Phase 12: manual worker assignment support.

ALTER TABLE public.service_request_assignments
ADD COLUMN IF NOT EXISTS assignment_note text;

CREATE INDEX IF NOT EXISTS idx_worker_profiles_metadata_availability
ON public.worker_profiles ((metadata->>'availability_status'));
