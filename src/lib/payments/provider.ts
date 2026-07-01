import type {
  PaymentProvider,
  PaymentProviderName,
} from './types';
import { mercadoPagoProvider } from './mercadopago';
import { payuProvider } from './payu';
import { calculatePlatformFee, calculateWorkerAmount, createPlaceholderProvider } from './placeholder';
import { wompiProvider } from './wompi';

export { calculatePlatformFee, calculateWorkerAmount, createPlaceholderProvider };

export const manualPaymentProvider = createPlaceholderProvider('manual');

export const paymentProviders = {
  manual: manualPaymentProvider,
  wompi: wompiProvider,
  mercadopago: mercadoPagoProvider,
  payu: payuProvider,
} satisfies Record<PaymentProviderName, PaymentProvider>;

export function getPaymentProvider(providerName: PaymentProviderName) {
  return paymentProviders[providerName];
}

export function normalizePaymentProviderName(providerName: string | null): PaymentProviderName | null {
  if (providerName === 'mercado_pago') {
    return 'mercadopago';
  }

  if (providerName === 'manual' || providerName === 'wompi' || providerName === 'mercadopago' || providerName === 'payu') {
    return providerName;
  }

  return null;
}
