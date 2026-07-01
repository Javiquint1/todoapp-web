export type PaymentProviderName = 'manual' | 'wompi' | 'mercadopago' | 'payu';
export type PaymentCurrency = 'COP';
export type ExternalPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled' | 'unknown';

export type PaymentProviderConfig = {
  name: PaymentProviderName;
  enabled: boolean;
};

export type CheckoutInput = {
  paymentId: string;
  jobId: string;
  customerProfileId: string;
  workerProfileId: string;
  amount: number;
  platformFee?: number;
  currency: PaymentCurrency;
  description: string;
  customerEmail?: string;
  redirectUrl?: string;
};

export type CheckoutResult = {
  provider: PaymentProviderName;
  providerReference: string;
  checkoutUrl?: string;
  status: ExternalPaymentStatus;
  raw?: unknown;
};

export type WebhookVerificationInput = {
  provider: PaymentProviderName;
  payload: unknown;
  rawBody: string;
  headers: Headers;
};

export type WebhookVerificationResult = {
  valid: boolean;
  provider: PaymentProviderName;
  providerReference?: string;
  status?: ExternalPaymentStatus;
  eventType?: string;
  raw?: unknown;
};

export type ProviderStatusResult = {
  provider: PaymentProviderName;
  providerReference: string;
  status: ExternalPaymentStatus;
  raw?: unknown;
};

export type RefundInput = {
  paymentId: string;
  providerReference: string;
  amount: number;
  currency: PaymentCurrency;
  reason?: string;
};

export type RefundResult = {
  provider: PaymentProviderName;
  providerReference: string;
  refundReference?: string;
  status: ExternalPaymentStatus;
  raw?: unknown;
};

export type PaymentProvider = PaymentProviderConfig & {
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyWebhook(input: WebhookVerificationInput): Promise<WebhookVerificationResult>;
  getPaymentStatus(providerReference: string): Promise<ProviderStatusResult>;
  refundPayment(input: RefundInput): Promise<RefundResult>;
  calculatePlatformFee(amount: number): number;
  calculateWorkerAmount(amount: number): number;
};
