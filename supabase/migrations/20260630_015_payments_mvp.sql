ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS platform_fee numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS worker_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'not_ready',
  ADD COLUMN IF NOT EXISTS admin_notes text;

UPDATE public.payments
SET
  payment_provider = COALESCE(NULLIF(payment_provider, ''), NULLIF(payment_method, ''), 'manual'),
  payment_status = COALESCE(
    payment_status,
    CASE status
      WHEN 'PENDING' THEN 'pending'
      WHEN 'AUTHORIZED' THEN 'pending'
      WHEN 'CAPTURED' THEN 'paid'
      WHEN 'FAILED' THEN 'failed'
      WHEN 'REFUNDED' THEN 'refunded'
      ELSE lower(status)
    END
  ),
  payout_status = COALESCE(NULLIF(payout_status, ''), 'not_ready'),
  worker_amount = COALESCE(worker_amount, amount - platform_fee);

ALTER TABLE public.payments
  ALTER COLUMN payment_status SET DEFAULT 'pending',
  ALTER COLUMN payment_status SET NOT NULL,
  ALTER COLUMN worker_amount SET NOT NULL;

ALTER TABLE public.payments
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_status_check,
  DROP CONSTRAINT IF EXISTS payments_payment_status_check,
  DROP CONSTRAINT IF EXISTS payments_payout_status_check;

UPDATE public.payments
SET status = payment_status;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check CHECK (
    status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled')
  ),
  ADD CONSTRAINT payments_payment_status_check CHECK (
    payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled')
  ),
  ADD CONSTRAINT payments_payout_status_check CHECK (
    payout_status IN ('not_ready', 'pending', 'paid', 'failed', 'held')
  );

CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON public.payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_payout_status ON public.payments(payout_status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_provider ON public.payments(payment_provider);
