-- Initial schema for Todero Marketplace
-- Includes base tables, indexes, and conservative RLS policies.

-- Enable pgcrypto extension for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper function to keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profiles table, links to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('CUSTOMER', 'WORKER', 'ADMIN')),
  full_name text NOT NULL,
  email text NOT NULL,
  phone_number text,
  city text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'BANNED')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Customer profiles
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  address text,
  preferred_payment_method text,
  notification_preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_user_id ON public.customer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_profile_id ON public.customer_profiles(profile_id);

CREATE TRIGGER trg_customer_profiles_updated_at
BEFORE UPDATE ON public.customer_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Worker profiles
CREATE TABLE IF NOT EXISTS public.worker_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  service_radius_km int,
  is_verified boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'SUSPENDED')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'BANNED', 'INACTIVE')),
  bio text,
  experience_years int DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_worker_profiles_user_id ON public.worker_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_profile_id ON public.worker_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_status ON public.worker_profiles(status);

CREATE TRIGGER trg_worker_profiles_updated_at
BEFORE UPDATE ON public.worker_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Worker documents for verification
CREATE TABLE IF NOT EXISTS public.worker_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_profile_id uuid NOT NULL,
  document_type text NOT NULL,
  document_url text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (worker_profile_id) REFERENCES public.worker_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_worker_documents_worker_profile_id ON public.worker_documents(worker_profile_id);
CREATE INDEX IF NOT EXISTS idx_worker_documents_status ON public.worker_documents(status);

CREATE TRIGGER trg_worker_documents_updated_at
BEFORE UPDATE ON public.worker_documents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Worker verification checks
CREATE TABLE IF NOT EXISTS public.worker_verification_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_profile_id uuid NOT NULL,
  check_type text NOT NULL,
  result text NOT NULL CHECK (result IN ('PASSED', 'FAILED', 'NEEDS_MORE_INFO')),
  notes text,
  conducted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (worker_profile_id) REFERENCES public.worker_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_verification_checks_worker_profile_id ON public.worker_verification_checks(worker_profile_id);
CREATE INDEX IF NOT EXISTS idx_verification_checks_check_type ON public.worker_verification_checks(check_type);

CREATE TRIGGER trg_worker_verification_checks_updated_at
BEFORE UPDATE ON public.worker_verification_checks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Service categories
CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_categories_status ON public.service_categories(status);

CREATE TRIGGER trg_service_categories_updated_at
BEFORE UPDATE ON public.service_categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Service subcategories
CREATE TABLE IF NOT EXISTS public.service_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (category_id) REFERENCES public.service_categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_service_subcategories_category_id ON public.service_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_service_subcategories_status ON public.service_subcategories(status);

CREATE TRIGGER trg_service_subcategories_updated_at
BEFORE UPDATE ON public.service_subcategories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Service requests
CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_profile_id uuid NOT NULL,
  category_id uuid NOT NULL,
  subcategory_id uuid,
  city text NOT NULL,
  address text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PENDING', 'ASSIGNED', 'COMPLETED', 'CANCELLED')),
  assigned_worker_profile_id uuid,
  scheduled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (customer_profile_id) REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES public.service_categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (subcategory_id) REFERENCES public.service_subcategories(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_worker_profile_id) REFERENCES public.worker_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_service_requests_customer_profile_id ON public.service_requests(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_worker_profile_id ON public.service_requests(assigned_worker_profile_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_category_id ON public.service_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_city ON public.service_requests(city);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);

CREATE TRIGGER trg_service_requests_updated_at
BEFORE UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Service request photos
CREATE TABLE IF NOT EXISTS public.service_request_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL,
  photo_url text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_service_request_photos_service_request_id ON public.service_request_photos(service_request_id);

CREATE TRIGGER trg_service_request_photos_updated_at
BEFORE UPDATE ON public.service_request_photos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Job quotes
CREATE TABLE IF NOT EXISTS public.job_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL,
  worker_profile_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_profile_id) REFERENCES public.worker_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_quotes_service_request_id ON public.job_quotes(service_request_id);
CREATE INDEX IF NOT EXISTS idx_job_quotes_worker_profile_id ON public.job_quotes(worker_profile_id);
CREATE INDEX IF NOT EXISTS idx_job_quotes_status ON public.job_quotes(status);

CREATE TRIGGER trg_job_quotes_updated_at
BEFORE UPDATE ON public.job_quotes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Jobs
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL,
  quote_id uuid,
  customer_profile_id uuid NOT NULL,
  worker_profile_id uuid NOT NULL,
  category_id uuid NOT NULL,
  scheduled_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED')),
  total_amount numeric(12,2),
  commission_amount numeric(12,2),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (service_request_id) REFERENCES public.service_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (quote_id) REFERENCES public.job_quotes(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_profile_id) REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_profile_id) REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES public.service_categories(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_jobs_service_request_id ON public.jobs(service_request_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_profile_id ON public.jobs(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_jobs_worker_profile_id ON public.jobs(worker_profile_id);
CREATE INDEX IF NOT EXISTS idx_jobs_category_id ON public.jobs(category_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);

CREATE TRIGGER trg_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Job messages
CREATE TABLE IF NOT EXISTS public.job_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  sender_profile_id uuid NOT NULL,
  recipient_profile_id uuid NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_messages_job_id ON public.job_messages(job_id);
CREATE INDEX IF NOT EXISTS idx_job_messages_sender_profile_id ON public.job_messages(sender_profile_id);
CREATE INDEX IF NOT EXISTS idx_job_messages_recipient_profile_id ON public.job_messages(recipient_profile_id);

CREATE TRIGGER trg_job_messages_updated_at
BEFORE UPDATE ON public.job_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  customer_profile_id uuid NOT NULL,
  worker_profile_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'COP',
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED')),
  payment_method text,
  provider_reference text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_profile_id) REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_profile_id) REFERENCES public.worker_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_job_id ON public.payments(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_profile_id ON public.payments(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_payments_worker_profile_id ON public.payments(worker_profile_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  reviewer_profile_id uuid NOT NULL,
  reviewee_profile_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  status text NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'PENDING', 'HIDDEN')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewee_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_job_id ON public.reviews(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_profile_id ON public.reviews(reviewer_profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_profile_id ON public.reviews(reviewee_profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);

CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Disputes
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  filed_by_profile_id uuid NOT NULL,
  filed_against_profile_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')),
  resolution text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (filed_by_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (filed_against_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_disputes_job_id ON public.disputes(job_id);
CREATE INDEX IF NOT EXISTS idx_disputes_filed_by_profile_id ON public.disputes(filed_by_profile_id);
CREATE INDEX IF NOT EXISTS idx_disputes_filed_against_profile_id ON public.disputes(filed_against_profile_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);

CREATE TRIGGER trg_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id uuid,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (actor_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_profile_id ON public.audit_logs(actor_profile_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);

CREATE TRIGGER trg_audit_logs_updated_at
BEFORE UPDATE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket for worker onboarding photos and verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('worker-documents', 'worker-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Security helper functions.
-- SECURITY DEFINER avoids recursive RLS checks when policies need role lookups.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'ADMIN'
      AND status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_customer_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.customer_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_worker_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.worker_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_approved_worker_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.worker_profiles
  WHERE user_id = auth.uid()
    AND is_verified = true
    AND verification_status = 'APPROVED'
    AND status = 'ACTIVE'
  LIMIT 1;
$$;

-- Enable row level security and policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_verification_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin policies: admins can read and manage all records.
CREATE POLICY allow_admins_on_profiles ON public.profiles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY allow_admins_on_customer_profiles ON public.customer_profiles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY allow_admins_on_worker_profiles ON public.worker_profiles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY allow_admins_on_worker_documents ON public.worker_documents FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY allow_admins_on_worker_verification_checks ON public.worker_verification_checks FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY allow_admins_on_service_categories ON public.service_categories FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY allow_admins_on_service_subcategories ON public.service_subcategories FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY allow_admins_on_service_requests ON public.service_requests FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY allow_admins_on_service_request_photos ON public.service_request_photos FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY allow_admins_on_job_quotes ON public.job_quotes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY allow_admins_on_jobs ON public.jobs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY allow_admins_on_job_messages ON public.job_messages FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY allow_admins_on_payments ON public.payments FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY allow_admins_on_reviews ON public.reviews FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY allow_admins_on_disputes ON public.disputes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY allow_admins_on_audit_logs ON public.audit_logs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Profiles policies
CREATE POLICY customers_read_own_profile ON public.profiles FOR SELECT USING (auth.uid() = user_id AND role = 'CUSTOMER');
CREATE POLICY customers_update_own_profile ON public.profiles FOR UPDATE USING (auth.uid() = user_id AND role = 'CUSTOMER') WITH CHECK (auth.uid() = user_id AND role = 'CUSTOMER');
CREATE POLICY workers_read_own_profile ON public.profiles FOR SELECT USING (auth.uid() = user_id AND role = 'WORKER');
CREATE POLICY workers_update_own_profile ON public.profiles FOR UPDATE USING (auth.uid() = user_id AND role = 'WORKER') WITH CHECK (auth.uid() = user_id AND role = 'WORKER');

-- Customer profiles policies
CREATE POLICY customer_profiles_own_read ON public.customer_profiles FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY customer_profiles_own_update ON public.customer_profiles FOR UPDATE USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

-- Worker profiles policies
CREATE POLICY worker_profiles_own_read ON public.worker_profiles FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY worker_profiles_own_update ON public.worker_profiles FOR UPDATE USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
  AND is_verified = false
  AND verification_status IN ('PENDING', 'SUBMITTED')
);

CREATE POLICY worker_documents_own_read ON public.worker_documents FOR SELECT USING (
  worker_profile_id = public.current_worker_profile_id()
);

CREATE POLICY worker_documents_own_insert ON public.worker_documents FOR INSERT WITH CHECK (
  worker_profile_id = public.current_worker_profile_id()
);

CREATE POLICY worker_documents_own_update_pending ON public.worker_documents FOR UPDATE USING (
  worker_profile_id = public.current_worker_profile_id()
  AND status = 'PENDING'
)
WITH CHECK (
  worker_profile_id = public.current_worker_profile_id()
  AND status = 'PENDING'
);

CREATE POLICY worker_document_storage_own_upload ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'worker-documents'
  AND split_part(name, '/', 1) = public.current_worker_profile_id()::text
);

CREATE POLICY worker_document_storage_own_read ON storage.objects FOR SELECT USING (
  bucket_id = 'worker-documents'
  AND split_part(name, '/', 1) = public.current_worker_profile_id()::text
);

CREATE POLICY admins_manage_worker_document_storage ON storage.objects FOR ALL USING (
  bucket_id = 'worker-documents'
  AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'worker-documents'
  AND public.is_admin()
);

-- Service requests policies
CREATE POLICY customer_service_requests_own_read ON public.service_requests FOR SELECT USING (
  customer_profile_id = public.current_customer_profile_id()
);

CREATE POLICY customer_service_requests_own_update ON public.service_requests FOR UPDATE USING (
  customer_profile_id = public.current_customer_profile_id()
)
WITH CHECK (
  customer_profile_id = public.current_customer_profile_id()
);

CREATE POLICY worker_service_requests_assigned_or_open_read ON public.service_requests FOR SELECT USING (
  assigned_worker_profile_id = public.current_worker_profile_id()
  OR (
    status = 'OPEN'
    AND public.current_approved_worker_profile_id() IS NOT NULL
  )
);

CREATE POLICY worker_service_requests_assigned_update ON public.service_requests FOR UPDATE USING (
  assigned_worker_profile_id = public.current_worker_profile_id()
)
WITH CHECK (
  assigned_worker_profile_id = public.current_worker_profile_id()
);

-- Enforce insert permissions only for authenticated users with valid roles where needed
CREATE POLICY insert_profile_for_signed_in_user ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY insert_customer_profile_for_signed_in_user ON public.customer_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY insert_worker_profile_for_signed_in_user ON public.worker_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY insert_service_request_for_customer ON public.service_requests FOR INSERT WITH CHECK (
  customer_profile_id = public.current_customer_profile_id()
);
