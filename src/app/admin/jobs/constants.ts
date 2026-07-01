export const jobStatuses = [
  'accepted',
  'scheduled',
  'worker_on_the_way',
  'in_progress',
  'completed_by_worker',
  'approved_by_customer',
  'disputed',
  'cancelled',
  'closed',
] as const;

export type JobStatus = (typeof jobStatuses)[number];

export const jobStatusLabels: Record<string, string> = {
  accepted: 'Aceptado',
  scheduled: 'Programado',
  worker_on_the_way: 'Trabajador en camino',
  in_progress: 'En progreso',
  completed_by_worker: 'Completado por trabajador',
  approved_by_customer: 'Aprobado por cliente',
  disputed: 'En disputa',
  cancelled: 'Cancelado',
  closed: 'Cerrado',
  SCHEDULED: 'Programado',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  DISPUTED: 'En disputa',
};

export function statusLabel(status: string) {
  return jobStatusLabels[status] ?? status;
}
