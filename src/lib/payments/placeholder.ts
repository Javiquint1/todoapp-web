import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
  PaymentProviderName,
  ProviderStatusResult,
  RefundInput,
  RefundResult,
  WebhookVerificationInput,
  WebhookVerificationResult,
} from './types';

export const defaultPlatformFeeRate = 0.12;

export function calculatePlatformFee(amount: number, feeRate = defaultPlatformFeeRate) {
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * feeRate);
}

export function calculateWorkerAmount(amount: number, feeRate = defaultPlatformFeeRate) {
  return Math.max(0, amount - calculatePlatformFee(amount, feeRate));
}

function inactiveProviderError(providerName: PaymentProviderName) {
  return new Error(`El proveedor ${providerName} aun no esta activo. El panel administrativo sigue usando pagos manuales.`);
}

export function createPlaceholderProvider(name: PaymentProviderName, enabled = false): PaymentProvider {
  return {
    name,
    enabled,
    async createCheckout(_input: CheckoutInput): Promise<CheckoutResult> {
      // TODO: Implementar checkout real cuando se habilite la integracion del proveedor.
      throw inactiveProviderError(name);
    },
    async verifyWebhook(_input: WebhookVerificationInput): Promise<WebhookVerificationResult> {
      // TODO: Validar firmas/eventos reales antes de activar webhooks productivos.
      throw inactiveProviderError(name);
    },
    async getPaymentStatus(_providerReference: string): Promise<ProviderStatusResult> {
      // TODO: Consultar el estado real del pago en el proveedor.
      throw inactiveProviderError(name);
    },
    async refundPayment(_input: RefundInput): Promise<RefundResult> {
      // TODO: Implementar reembolsos reales con idempotencia y auditoria.
      throw inactiveProviderError(name);
    },
    calculatePlatformFee,
    calculateWorkerAmount,
  };
}
