import Link from 'next/link';
import { requireAdmin } from '@/lib/supabase-server';

type PageProps = {
  searchParams?: {
    status?: string;
  };
};

type WorkerProfile = {
  id: string;
  profile_id: string;
  verification_status: string;
  status: string;
  is_verified: boolean;
  experience_years: number | null;
  service_radius_km: number | null;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  city: string | null;
  status: string;
};

const statusFilters = ['ALL', 'PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const;

const statusLabels: Record<string, string> = {
  ALL: 'Todos',
  PENDING: 'Pendiente',
  SUBMITTED: 'Enviada',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  SUSPENDED: 'Suspendida',
};

export const dynamic = 'force-dynamic';

export default async function AdminWorkersPage({ searchParams }: PageProps) {
  const { supabase } = await requireAdmin();
  const selectedStatus = statusFilters.includes(searchParams?.status as (typeof statusFilters)[number])
    ? searchParams?.status
    : 'ALL';

  let query = supabase
    .from('worker_profiles')
    .select('id,profile_id,verification_status,status,is_verified,experience_years,service_radius_km,created_at')
    .order('created_at', { ascending: false });

  if (selectedStatus !== 'ALL') {
    query = query.eq('verification_status', selectedStatus);
  }

  const { data: workers, error: workersError } = await query;

  if (workersError) {
    throw new Error(workersError.message);
  }

  const typedWorkers = (workers ?? []) as WorkerProfile[];
  const profileIds = typedWorkers.map((worker) => worker.profile_id);
  const { data: profiles, error: profilesError } = profileIds.length
    ? await supabase.from('profiles').select('id,full_name,email,phone_number,city,status').in('id', profileIds)
    : { data: [], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profilesById = new Map(((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile]));

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Trabajadores</p>
          <h1>Verificación de trabajadores</h1>
          <p>Revisa perfiles, documentos, zonas de servicio, referencias y estado de verificación.</p>
        </div>
        <Link className="secondary-link" href="/admin">
          Volver al panel
        </Link>
      </section>

      <section className="admin-table">
        <nav className="filter-bar" aria-label="Filtros de verificacion">
          {statusFilters.map((status) => {
            const href = status === 'ALL' ? '/admin/workers' : `/admin/workers?status=${status}`;
            return (
              <Link className={selectedStatus === status ? 'filter-chip filter-chip-active' : 'filter-chip'} href={href} key={status}>
                {statusLabels[status]}
              </Link>
            );
          })}
        </nav>

        <div className="admin-row admin-row-head">
          <span>Trabajador</span>
          <span>Ciudad</span>
          <span>Verificación</span>
          <span>Servicio</span>
          <span>Acción</span>
        </div>
        {typedWorkers.map((worker) => {
          const profile = profilesById.get(worker.profile_id);

          return (
            <div className="admin-row" key={worker.id}>
              <span>
                <strong>{profile?.full_name ?? 'Sin nombre'}</strong>
                <small>{profile?.email ?? 'Sin correo'}</small>
              </span>
              <span>{profile?.city ?? 'No registrada'}</span>
              <span className={`status-pill status-${worker.verification_status.toLowerCase()}`}>
                {statusLabels[worker.verification_status] ?? worker.verification_status}
              </span>
              <span>
                {worker.experience_years ?? 0} años
                <small>{worker.service_radius_km ?? 'Sin radio'} km</small>
              </span>
              <Link className="secondary-link" href={`/admin/workers/${worker.id}`}>
                Abrir perfil
              </Link>
            </div>
          );
        })}
        {!typedWorkers.length ? <p className="empty-state">No hay trabajadores para este filtro.</p> : null}
      </section>
    </main>
  );
}
