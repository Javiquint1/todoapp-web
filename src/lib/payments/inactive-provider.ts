import type { CreatePaymentIntentInput, PaymentProvider, PaymentProviderName } from './types';

function inactiveError(providerName: PaymentProviderName) {
  return new Error(`El proveedor ${providerName} aun no esta activo en este MVP.`);
}

export function createInactivePaymentProvider(name: PaymentProviderName): PaymentProvider {
  return {
    name,
    active: false,
    async createPaymentIntent(_input: CreatePaymentIntentInput) {
      throw inactiveError(name);
    },
    async verifyProviderReference(_providerReference: string) {
      throw inactiveError(name);
    },
  };
}
