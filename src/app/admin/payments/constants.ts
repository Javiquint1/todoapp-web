export const paymentStatuses = ['pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled'] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const payoutStatuses = ['not_ready', 'pending', 'paid', 'failed', 'held'] as const;
export type PayoutStatus = (typeof payoutStatuses)[number];

export const paymentStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  failed: 'Fallido',
  refunded: 'Reembolsado',
  partially_refunded: 'Reembolso parcial',
  cancelled: 'Cancelado',
  PENDING: 'Pendiente',
  AUTHORIZED: 'Autorizado',
  CAPTURED: 'Pagado',
  FAILED: 'Fallido',
  REFUNDED: 'Reembolsado',
};

export const payoutStatusLabels: Record<string, string> = {
  not_ready: 'No listo',
  pending: 'Pendiente',
  paid: 'Pagado',
  failed: 'Fallido',
  held: 'Retenido',
};

export const inactivePaymentProviders = ['manual', 'wompi', 'mercado_pago', 'payu'] as const;

export function paymentStatusLabel(status: string) {
  return paymentStatusLabels[status] ?? status;
}

export function payoutStatusLabel(status: string) {
  return payoutStatusLabels[status] ?? status;
}
