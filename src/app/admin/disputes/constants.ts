export const disputeTypes = [
  'no_show',
  'incomplete_work',
  'damage_reported',
  'payment_issue',
  'unsafe_behavior',
  'price_disagreement',
  'other',
] as const;

export type DisputeType = (typeof disputeTypes)[number];

export const disputeStatuses = [
  'open',
  'under_review',
  'waiting_for_customer',
  'waiting_for_worker',
  'resolved',
  'rejected',
  'escalated',
  'closed',
] as const;

export type DisputeStatus = (typeof disputeStatuses)[number];

export const disputeTypeLabels: Record<string, string> = {
  no_show: 'No asistencia',
  incomplete_work: 'Trabajo incompleto',
  damage_reported: 'Reporte de daño',
  payment_issue: 'Situación de pago',
  unsafe_behavior: 'Reporte de seguridad',
  price_disagreement: 'Diferencia sobre precio',
  other: 'Otro',
  QUALITY: 'Calidad',
  PAYMENT: 'Pago',
  NO_SHOW: 'No asistencia',
  SAFETY: 'Seguridad',
  PROPERTY_DAMAGE: 'Reporte de daño',
  OTHER: 'Otro',
};

export const disputeStatusLabels: Record<string, string> = {
  open: 'Abierta',
  under_review: 'En revisión',
  waiting_for_customer: 'Esperando al cliente',
  waiting_for_worker: 'Esperando al trabajador',
  resolved: 'Resuelta',
  rejected: 'Rechazada',
  escalated: 'Escalada',
  closed: 'Cerrada',
  OPEN: 'Abierta',
  UNDER_REVIEW: 'En revisión',
  RESOLVED: 'Resuelta',
  REJECTED: 'Rechazada',
};

export function disputeTypeLabel(type: string | null) {
  return type ? disputeTypeLabels[type] ?? type : 'Otro';
}

export function disputeStatusLabel(status: string) {
  return disputeStatusLabels[status] ?? status;
}

const disputeAuditActionLabels: Record<string, string> = {
  dispute_admin_notes_updated: 'Notas internas actualizadas',
  dispute_status_updated_by_admin: 'Estado actualizado por administración',
  dispute_more_information_requested: 'Información adicional solicitada',
  dispute_closed_by_admin: 'Disputa cerrada por administración',
};

export function disputeAuditActionLabel(action: string) {
  return disputeAuditActionLabels[action] ?? action;
}
