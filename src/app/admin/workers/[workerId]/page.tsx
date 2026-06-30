import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase-server';

type PageProps = {
  params: {
    workerId: string;
  };
};

type WorkerProfile = {
  id: string;
  profile_id: string;
  service_radius_km: number | null;
  verification_status: string;
  status: string;
  is_verified: boolean;
  bio: string | null;
  experience_years: number | null;
  metadata: Record<string, unknown> | null;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  city: string | null;
  status: string;
};

type WorkerDocument = {
  id: string;
  document_type: string;
  document_url: string;
  status: string;
  notes: string | null;
};

const documentLabels: Record<string, string> = {
  profile_photo: 'Foto de perfil',
  cedula_front: 'Cedula frontal',
  cedula_back: 'Cedula trasera',
  selfie: 'Selfie',
  background_check: 'Antecedentes',
  rut: 'RUT',
  certification: 'Certificacion',
  portfolio_photo: 'Foto de portafolio',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  SUBMITTED: 'Enviada',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  SUSPENDED: 'Suspendida',
};

export const dynamic = 'force-dynamic';

function readStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function readText(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item))).join('\n');
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return '';
}

export default async function AdminWorkerProfilePage({ params }: PageProps) {
  const { supabase } = await requireAdmin();
  const { data: worker, error: workerError } = await supabase
    .from('worker_profiles')
    .select('id,profile_id,service_radius_km,verification_status,status,is_verified,bio,experience_years,metadata')
    .eq('id', params.workerId)
    .single();

  if (workerError || !worker) {
    notFound();
  }

  const typedWorker = worker as WorkerProfile;
  const [{ data: profile, error: profileError }, { data: documents, error: documentsError }] = await Promise.all([
    supabase.from('profiles').select('id,full_name,email,phone_number,city,status').eq('id', typedWorker.profile_id).single(),
    supabase
      .from('worker_documents')
      .select('id,document_type,document_url,status,notes')
      .eq('worker_profile_id', typedWorker.id)
      .order('created_at', { ascending: false }),
  ]);

  if (profileError || documentsError) {
    throw new Error(profileError?.message || documentsError?.message);
  }

  const typedProfile = profile as Profile;
  const metadata = typedWorker.metadata ?? {};
  const skills = readStringList(metadata.skills);
  const serviceAreas = readStringList(metadata.service_areas);
  const references = readText(metadata.references);
  const portfolio = readStringList(metadata.portfolio_urls);

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Perfil del trabajador</p>
          <h1>{typedProfile.full_name}</h1>
          <p>
            {typedProfile.email} · {typedProfile.phone_number ?? 'Sin telefono'}
          </p>
        </div>
        <div className="header-actions">
          <Link className="secondary-link" href="/admin/workers">
            Volver a workers
          </Link>
          <Link className="primary-button" href={`/admin/workers/${typedWorker.id}/verification`}>
            Abrir verificación
          </Link>
        </div>
      </section>

      <section className="admin-grid">
        <article className="admin-card">
          <h2>Resumen</h2>
          <dl className="detail-list">
            <div>
              <dt>Verificacion</dt>
              <dd className={`status-pill status-${typedWorker.verification_status.toLowerCase()}`}>
                {statusLabels[typedWorker.verification_status] ?? typedWorker.verification_status}
              </dd>
            </div>
            <div>
              <dt>Perfil</dt>
              <dd>{typedProfile.status}</dd>
            </div>
            <div>
              <dt>Trabajador</dt>
              <dd>{typedWorker.status}</dd>
            </div>
            <div>
              <dt>Verificado</dt>
              <dd>{typedWorker.is_verified ? 'Si' : 'No'}</dd>
            </div>
          </dl>
        </article>

        <article className="admin-card">
          <h2>Detalles</h2>
          <dl className="detail-list">
            <div>
              <dt>Ciudad</dt>
              <dd>{typedProfile.city ?? 'No registrada'}</dd>
            </div>
            <div>
              <dt>Experiencia</dt>
              <dd>{typedWorker.experience_years ?? 0} años</dd>
            </div>
            <div>
              <dt>Radio</dt>
              <dd>{typedWorker.service_radius_km ?? 'No definido'} km</dd>
            </div>
          </dl>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Bio</h2>
          <p className="admin-copy">{typedWorker.bio ?? 'Sin biografia registrada.'}</p>
        </article>

        <article className="admin-card">
          <h2>Habilidades</h2>
          <p className="admin-copy">{skills.length ? skills.join(', ') : 'Sin habilidades registradas.'}</p>
        </article>

        <article className="admin-card">
          <h2>Zonas de servicio</h2>
          <p className="admin-copy">{serviceAreas.length ? serviceAreas.join(', ') : 'Sin zonas registradas.'}</p>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Documentos cargados</h2>
          <div className="document-list">
            {((documents ?? []) as WorkerDocument[]).map((document) => (
              <a className="document-link" href={document.document_url} key={document.id} rel="noreferrer" target="_blank">
                <span>{documentLabels[document.document_type] ?? document.document_type}</span>
                <small>
                  {document.status}
                  {document.notes ? ` · ${document.notes}` : ''}
                </small>
              </a>
            ))}
            {!documents?.length ? <p className="admin-copy">No hay documentos cargados.</p> : null}
          </div>
        </article>

        <article className="admin-card">
          <h2>References</h2>
          <pre className="metadata-block">{references || 'Sin referencias registradas.'}</pre>
        </article>

        <article className="admin-card">
          <h2>Portfolio</h2>
          <div className="document-list">
            {portfolio.map((url) => (
              <a className="document-link" href={url} key={url} rel="noreferrer" target="_blank">
                <span>Portafolio</span>
                <small>Abrir</small>
              </a>
            ))}
            {!portfolio.length ? <p className="admin-copy">Sin portafolio registrado.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
