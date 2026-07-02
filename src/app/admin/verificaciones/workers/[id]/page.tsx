import Link from 'next/link';
import { notFound } from 'next/navigation';
import { decideWorkerApplication, saveAdminNotes, saveVerificationCheck } from '../../actions';
import { requireAdmin } from '@/lib/supabase-server';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type WorkerProfile = {
  id: string;
  profile_id: string;
  service_radius_km: number | null;
  verification_status: string;
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
};

type WorkerDocument = {
  id: string;
  document_type: string;
  document_url: string;
  status: string;
  notes: string | null;
};

type VerificationCheck = {
  id: string;
  check_type: string;
  result: string;
  notes: string | null;
  conducted_at: string;
};

const checks = [
  { id: 'identity_document', label: 'Documento de identidad' },
  { id: 'selfie_match', label: 'Selfie y coincidencia facial' },
  { id: 'background_check', label: 'Antecedentes' },
  { id: 'rut', label: 'RUT' },
  { id: 'certifications', label: 'Certificaciones' },
  { id: 'references', label: 'Referencias' },
];

const documentLabels: Record<string, string> = {
  profile_photo: 'Foto de perfil',
  cedula_front: 'Cédula frontal',
  cedula_back: 'Cédula trasera',
  selfie: 'Selfie',
  background_check: 'Antecedentes',
  rut: 'RUT',
  certification: 'Certificación',
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

export default async function WorkerVerificationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: worker, error: workerError } = await supabase
    .from('worker_profiles')
    .select(
      'id,profile_id,service_radius_km,verification_status,bio,experience_years,metadata',
    )
    .eq('id', id)
    .single();

  if (workerError || !worker) {
    notFound();
  }

  const typedWorker = worker as WorkerProfile;

  const [{ data: profile, error: profileError }, { data: documents, error: documentsError }, { data: savedChecks, error: checksError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id,full_name,email,phone_number,city')
        .eq('id', typedWorker.profile_id)
        .single(),
      supabase
        .from('worker_documents')
        .select('id,document_type,document_url,status,notes')
        .eq('worker_profile_id', typedWorker.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('worker_verification_checks')
        .select('id,check_type,result,notes,conducted_at')
        .eq('worker_profile_id', typedWorker.id)
        .order('conducted_at', { ascending: false }),
    ]);

  if (profileError || documentsError || checksError) {
    throw new Error(profileError?.message || documentsError?.message || checksError?.message);
  }

  const typedProfile = profile as Profile;
  const metadata = typedWorker.metadata ?? {};
  const skills = readStringList(metadata.skills);
  const serviceAreas = readStringList(metadata.service_areas);
  const adminNotes = typeof metadata.admin_notes === 'string' ? metadata.admin_notes : '';
  const references = typeof metadata.references === 'string' ? metadata.references : '';
  const latestChecks = new Map<string, VerificationCheck>();

  for (const check of (savedChecks ?? []) as VerificationCheck[]) {
    if (!latestChecks.has(check.check_type)) {
      latestChecks.set(check.check_type, check);
    }
  }

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Perfil del trabajador</p>
          <h1>{typedProfile.full_name}</h1>
          <p>
            {typedProfile.email} · {typedProfile.phone_number ?? 'Sin teléfono'}
          </p>
        </div>
        <Link className="secondary-link" href="/admin/verificaciones">
          Volver a solicitudes
        </Link>
      </section>

      <section className="admin-grid">
        <article className="admin-card">
          <h2>Resumen</h2>
          <dl className="detail-list">
            <div>
              <dt>Estado</dt>
              <dd className={`status-pill status-${typedWorker.verification_status.toLowerCase()}`}>
                {statusLabels[typedWorker.verification_status] ?? typedWorker.verification_status}
              </dd>
            </div>
            <div>
              <dt>Ciudad</dt>
              <dd>{typedProfile.city ?? 'No registrada'}</dd>
            </div>
            <div>
              <dt>Experiencia</dt>
              <dd>{typedWorker.experience_years ?? 0} años</dd>
            </div>
            <div>
              <dt>Radio de servicio</dt>
              <dd>{typedWorker.service_radius_km ?? 'No definido'} km</dd>
            </div>
          </dl>
        </article>

        <article className="admin-card">
          <h2>Habilidades y zonas</h2>
          <p>{skills.length ? skills.join(', ') : 'Sin habilidades registradas.'}</p>
          <p>{serviceAreas.length ? serviceAreas.join(', ') : 'Sin zonas registradas.'}</p>
          <p>{typedWorker.bio ?? 'Sin biografía.'}</p>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Documentos cargados</h2>
          <div className="document-list">
            {((documents ?? []) as WorkerDocument[]).map((document) => (
              <a className="document-link" href={document.document_url} key={document.id} rel="noreferrer" target="_blank">
                <span>{documentLabels[document.document_type] ?? document.document_type}</span>
                <small>{document.status}</small>
              </a>
            ))}
            {!documents?.length ? <p>No hay documentos cargados.</p> : null}
          </div>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Checks de verificación</h2>
          <div className="check-list">
            {checks.map((check) => {
              const savedCheck = latestChecks.get(check.id);

              return (
                <form action={saveVerificationCheck} className="check-row" key={check.id}>
                  <input name="workerProfileId" type="hidden" value={typedWorker.id} />
                  <input name="checkType" type="hidden" value={check.id} />
                  <div>
                    <strong>{check.label}</strong>
                    <small>{savedCheck ? `Último resultado: ${savedCheck.result}` : 'Sin revisar'}</small>
                  </div>
                  <select defaultValue={savedCheck?.result ?? 'NEEDS_MORE_INFO'} name="result">
                    <option value="PASSED">Aprobado</option>
                    <option value="FAILED">Fallido</option>
                    <option value="NEEDS_MORE_INFO">Necesita más información</option>
                  </select>
                  <input name="notes" placeholder="Notas del check" />
                  <button className="small-action" type="submit">
                    Guardar
                  </button>
                </form>
              );
            })}
          </div>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Notas internas</h2>
          <form action={saveAdminNotes} className="form-stack">
            <input name="workerProfileId" type="hidden" value={typedWorker.id} />
            <textarea className="admin-textarea" defaultValue={adminNotes} name="adminNotes" />
            <button className="primary-button" type="submit">
              Guardar notas internas
            </button>
          </form>
        </article>

        <article className="admin-card">
          <h2>Referencias</h2>
          <p>{references || 'Sin referencias registradas.'}</p>
        </article>

        <article className="admin-card">
          <h2>Decisión final</h2>
          <form action={decideWorkerApplication} className="decision-stack">
            <input name="workerProfileId" type="hidden" value={typedWorker.id} />
            <input name="reason" placeholder="Motivo o nota de decisión" />
            <button className="primary-button" name="decision" type="submit" value="APPROVED">
              Aprobar trabajador
            </button>
            <button className="danger-button" name="decision" type="submit" value="REJECTED">
              Rechazar
            </button>
            <button className="warning-button" name="decision" type="submit" value="SUSPENDED">
              Suspender
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
