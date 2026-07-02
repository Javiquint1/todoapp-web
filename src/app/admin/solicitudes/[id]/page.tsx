import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase-server';
import { assignWorkersToRequest } from '../actions';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type WorkerProfileRow = {
  id: string;
  profile_id: string;
  experience_years: number | null;
  service_radius_km: number | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  city: string | null;
};

type AssignmentRow = {
  worker_profile_id: string;
  status: string;
};

const requestStatusLabels: Record<string, string> = {
  requested: 'Solicitada',
  reviewing: 'En revisión',
  assigned: 'Asignada',
  quoted: 'Cotizada',
  accepted: 'Aceptada',
  scheduled: 'Programada',
  in_progress: 'En progreso',
  completed: 'Completada',
  disputed: 'En disputa',
  cancelled: 'Cancelada',
  closed: 'Cerrada',
};

const assignmentStatusLabels: Record<string, string> = {
  ASSIGNED: 'Asignado',
  QUOTE_SUBMITTED: 'Cotización enviada',
  DECLINED: 'Declinado',
  ACCEPTED: 'Aceptado',
  CANCELLED: 'Cancelado',
};

export default async function AdminServiceRequestDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,city,address,details,status,scheduled_at,customer_profile_id,category_id,created_at')
    .eq('id', id)
    .single();

  if (requestError || !request) {
    notFound();
  }

  const [{ data: category }, { data: customer }, { data: assignments }, { data: workers }] = await Promise.all([
    supabase.from('service_categories').select('id,name').eq('id', request.category_id).single(),
    supabase.from('customer_profiles').select('id,profile_id').eq('id', request.customer_profile_id).single(),
    supabase.from('service_request_assignments').select('worker_profile_id,status').eq('service_request_id', id),
    supabase
      .from('worker_profiles')
      .select('id,profile_id,experience_years,service_radius_km')
      .eq('verification_status', 'APPROVED')
      .order('created_at', { ascending: false }),
  ]);

  const workerRows = (workers ?? []) as WorkerProfileRow[];
  const workerProfileIds = workerRows.map((worker) => worker.profile_id);
  const customerProfileId = customer?.profile_id ? [customer.profile_id] : [];
  const { data: profiles } = [...workerProfileIds, ...customerProfileId].length
    ? await supabase
        .from('profiles')
        .select('id,full_name,email,city')
        .in('id', [...workerProfileIds, ...customerProfileId])
    : { data: [] };

  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  const assignedByWorkerId = new Map(((assignments ?? []) as AssignmentRow[]).map((assignment) => [assignment.worker_profile_id, assignment]));
  const customerProfile = customer?.profile_id ? profileById.get(customer.profile_id) : null;

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Solicitud</p>
          <h1>{category?.name ?? 'Servicio solicitado'}</h1>
          <p>
            {request.city} · {request.address}
          </p>
        </div>
        <Link className="secondary-link" href="/admin/solicitudes">
          Volver a solicitudes
        </Link>
      </section>

      <section className="admin-grid">
        <article className="admin-card">
          <h2>Resumen</h2>
          <dl className="detail-list">
            <div>
              <dt>Estado</dt>
              <dd className={`status-pill status-${request.status.toLowerCase()}`}>
                {requestStatusLabels[request.status] ?? request.status}
              </dd>
            </div>
            <div>
              <dt>Cliente</dt>
              <dd>{customerProfile?.full_name ?? 'Cliente'}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{customerProfile?.email ?? '-'}</dd>
            </div>
            <div>
              <dt>Fecha deseada</dt>
              <dd>{request.scheduled_at ? new Date(request.scheduled_at).toLocaleString('es-CO') : 'Sin programar'}</dd>
            </div>
          </dl>
        </article>

        <article className="admin-card">
          <h2>Detalles</h2>
          <p className="admin-copy">{request.details ?? 'Sin detalles adicionales.'}</p>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Asignar trabajadores aprobados</h2>
          <form action={assignWorkersToRequest} className="assignment-list">
            <input name="serviceRequestId" type="hidden" value={request.id} />
            {workerRows.map((worker) => {
              const profile = profileById.get(worker.profile_id);
              const assignment = assignedByWorkerId.get(worker.id);
              return (
                <label className="assignment-row" key={worker.id}>
                  <input
                    defaultChecked={Boolean(assignment)}
                    name="workerProfileIds"
                    type="checkbox"
                    value={worker.id}
                  />
                  <span>
                    {profile?.full_name ?? 'Trabajador'}
                    <small>
                      {profile?.city ?? 'Sin ciudad'} · {worker.experience_years ?? 0} años ·{' '}
                      {assignment ? assignmentStatusLabels[assignment.status] ?? assignment.status : 'Disponible'}
                    </small>
                  </span>
                </label>
              );
            })}
            {!workerRows.length ? <p className="empty-state">No hay trabajadores aprobados todavía.</p> : null}
            <button className="primary-button" disabled={!workerRows.length} type="submit">
              Guardar asignación
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
