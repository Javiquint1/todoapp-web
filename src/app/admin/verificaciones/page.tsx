import Link from 'next/link';
import { requireAdmin } from '@/lib/supabase-server';

type WorkerProfile = {
  id: string;
  profile_id: string;
  verification_status: string;
  experience_years: number | null;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  city: string | null;
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  SUBMITTED: 'Enviada',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  SUSPENDED: 'Suspendida',
};

export const dynamic = 'force-dynamic';

export default async function VerificationDashboardPage() {
  const { supabase } = await requireAdmin();
  const { data: workers, error: workersError } = await supabase
    .from('worker_profiles')
    .select('id,profile_id,verification_status,experience_years,created_at')
    .order('created_at', { ascending: false });

  if (workersError) {
    throw new Error(workersError.message);
  }

  const profileIds = ((workers ?? []) as WorkerProfile[]).map((worker) => worker.profile_id);
  const { data: profiles, error: profilesError } = profileIds.length
    ? await supabase.from('profiles').select('id,full_name,email,phone_number,city').in('id', profileIds)
    : { data: [], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profilesById = new Map((profiles as Profile[] | null)?.map((profile) => [profile.id, profile]) ?? []);

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Verificación</p>
          <h1>Solicitudes de trabajadores</h1>
        </div>
        <Link className="secondary-link" href="/admin">
          Volver al panel
        </Link>
      </section>

      <section className="admin-table">
        <div className="admin-row admin-row-head">
          <span>Trabajador</span>
          <span>Ciudad</span>
          <span>Estado</span>
          <span>Experiencia</span>
          <span>Acción</span>
        </div>
        {((workers ?? []) as WorkerProfile[]).map((worker) => {
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
              <span>{worker.experience_years ?? 0} años</span>
              <Link className="secondary-link" href={`/admin/verificaciones/workers/${worker.id}`}>
                Abrir perfil
              </Link>
            </div>
          );
        })}
        {!workers?.length ? <p className="empty-state">No hay solicitudes de trabajadores todavía.</p> : null}
      </section>
    </main>
  );
}
