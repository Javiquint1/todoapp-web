export type PaymentProviderName = 'manual' | 'wompi' | 'mercado_pago' | 'payu';

export type CreatePaymentIntentInput = {
  paymentId: string;
  amount: number;
  currency: 'COP';
  customerProfileId: string;
  jobId: string;
};

export type PaymentProvider = {
  name: PaymentProviderName;
  active: false;
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<never>;
  verifyProviderReference(providerReference: string): Promise<never>;
};
