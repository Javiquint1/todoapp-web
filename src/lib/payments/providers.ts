import { createInactivePaymentProvider } from './inactive-provider';

export const paymentProviders = {
  manual: createInactivePaymentProvider('manual'),
  wompi: createInactivePaymentProvider('wompi'),
  mercado_pago: createInactivePaymentProvider('mercado_pago'),
  payu: createInactivePaymentProvider('payu'),
};

export function getInactivePaymentProvider(providerName: keyof typeof paymentProviders) {
  return paymentProviders[providerName];
}
