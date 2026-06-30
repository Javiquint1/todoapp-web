-- Phase 9: multi-worker assignment and quote acceptance MVP.

ALTER TABLE public.service_requests
DROP CONSTRAINT IF EXISTS service_requests_status_check;

ALTER TABLE public.service_requests
ADD CONSTRAINT service_requests_status_check
CHECK (status IN ('OPEN', 'PENDING', 'ASSIGNED', 'ACCEPTED', 'COMPLETED', 'CANCELLED'));

CREATE TABLE IF NOT EXISTS public.service_request_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL,
  worker_profile_id uuid NOT NULL,
  assigned_by_profile_id uuid,
  status text NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'QUOTE_SUBMITTED', 'DECLINED', 'ACCEPTED', 'CANCELLED')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (service_request_id, worker_profile_id),
  FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_profile_id) REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_request_assignments_request_id ON public.service_request_assignments(service_request_id);
CREATE INDEX IF NOT EXISTS idx_request_assignments_worker_id ON public.service_request_assignments(worker_profile_id);
CREATE INDEX IF NOT EXISTS idx_request_assignments_status ON public.service_request_assignments(status);

CREATE TRIGGER trg_service_request_assignments_updated_at
BEFORE UPDATE ON public.service_request_assignments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.job_quotes
ADD COLUMN IF NOT EXISTS labor_price numeric(12,2),
ADD COLUMN IF NOT EXISTS materials_estimate numeric(12,2),
ADD COLUMN IF NOT EXISTS diagnostic_fee numeric(12,2),
ADD COLUMN IF NOT EXISTS duration_minutes integer,
ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone;

UPDATE public.job_quotes
SET labor_price = amount
WHERE labor_price IS NULL;

ALTER TABLE public.job_quotes
ALTER COLUMN labor_price SET NOT NULL,
ALTER COLUMN labor_price SET DEFAULT 0,
ALTER COLUMN amount SET DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_quotes_one_per_worker_request
ON public.job_quotes(service_request_id, worker_profile_id);

ALTER TABLE public.service_request_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_admins_on_service_request_assignments
ON public.service_request_assignments
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY workers_read_own_assignments
ON public.service_request_assignments
FOR SELECT
USING (worker_profile_id = public.current_worker_profile_id());

CREATE POLICY workers_update_own_assignments
ON public.service_request_assignments
FOR UPDATE
USING (worker_profile_id = public.current_approved_worker_profile_id())
WITH CHECK (worker_profile_id = public.current_approved_worker_profile_id());

CREATE POLICY customers_read_request_assignments
ON public.service_request_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.service_requests sr
    WHERE sr.id = service_request_id
      AND sr.customer_profile_id = public.current_customer_profile_id()
  )
);

CREATE POLICY customers_update_request_assignments
ON public.service_request_assignments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.service_requests sr
    WHERE sr.id = service_request_id
      AND sr.customer_profile_id = public.current_customer_profile_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.service_requests sr
    WHERE sr.id = service_request_id
      AND sr.customer_profile_id = public.current_customer_profile_id()
  )
);

CREATE POLICY workers_insert_own_quotes
ON public.job_quotes
FOR INSERT
WITH CHECK (
  worker_profile_id = public.current_approved_worker_profile_id()
  AND EXISTS (
    SELECT 1
    FROM public.service_request_assignments sra
    WHERE sra.service_request_id = job_quotes.service_request_id
      AND sra.worker_profile_id = public.current_approved_worker_profile_id()
      AND sra.status IN ('ASSIGNED', 'QUOTE_SUBMITTED')
  )
);

CREATE POLICY workers_update_own_quotes
ON public.job_quotes
FOR UPDATE
USING (
  worker_profile_id = public.current_approved_worker_profile_id()
  AND status = 'PENDING'
)
WITH CHECK (
  worker_profile_id = public.current_approved_worker_profile_id()
);

CREATE POLICY workers_read_own_quotes
ON public.job_quotes
FOR SELECT
USING (worker_profile_id = public.current_worker_profile_id());

CREATE POLICY customers_read_request_quotes
ON public.job_quotes
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.service_requests sr
    WHERE sr.id = service_request_id
      AND sr.customer_profile_id = public.current_customer_profile_id()
  )
);

CREATE POLICY customers_accept_request_quotes
ON public.job_quotes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.service_requests sr
    WHERE sr.id = service_request_id
      AND sr.customer_profile_id = public.current_customer_profile_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.service_requests sr
    WHERE sr.id = service_request_id
      AND sr.customer_profile_id = public.current_customer_profile_id()
  )
);

CREATE POLICY customers_insert_accepted_jobs
ON public.jobs
FOR INSERT
WITH CHECK (
  customer_profile_id = public.current_customer_profile_id()
  AND EXISTS (
    SELECT 1
    FROM public.service_requests sr
    WHERE sr.id = service_request_id
      AND sr.customer_profile_id = public.current_customer_profile_id()
  )
);

CREATE POLICY customers_read_own_jobs
ON public.jobs
FOR SELECT
USING (customer_profile_id = public.current_customer_profile_id());

CREATE POLICY workers_read_own_jobs
ON public.jobs
FOR SELECT
USING (worker_profile_id = public.current_worker_profile_id());
