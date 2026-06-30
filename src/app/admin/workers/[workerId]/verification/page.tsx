import Link from 'next/link';
import { notFound } from 'next/navigation';
import { decideWorkerApplication, saveAdminNotes, saveVerificationCheck } from '../../actions';
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
  metadata: Record<string, unknown> | null;
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

type ChecklistItem = {
  id: string;
  label: string;
  documentType?: string;
  metadataKey?: string;
};

const checklist: ChecklistItem[] = [
  { id: 'profile_photo_uploaded', label: 'Foto de perfil cargada', documentType: 'profile_photo' },
  { id: 'cedula_front_uploaded', label: 'Cédula frontal cargada', documentType: 'cedula_front' },
  { id: 'cedula_back_uploaded', label: 'Cédula trasera cargada', documentType: 'cedula_back' },
  { id: 'selfie_uploaded', label: 'Selfie cargada', documentType: 'selfie' },
  { id: 'phone_verified', label: 'Teléfono verificado', metadataKey: 'phone_verified' },
  { id: 'email_verified', label: 'Correo verificado', metadataKey: 'email_verified' },
  { id: 'judicial_background_reviewed', label: 'Antecedentes judiciales revisados' },
  { id: 'procuraduria_background_reviewed', label: 'Antecedentes de Procuraduría revisados' },
  { id: 'references_reviewed', label: 'Referencias revisadas' },
  { id: 'skills_reviewed', label: 'Habilidades revisadas' },
  { id: 'portfolio_reviewed', label: 'Portafolio revisado' },
  { id: 'terms_accepted', label: 'Términos aceptados', metadataKey: 'terms_accepted' },
  { id: 'data_authorization_accepted', label: 'Autorización de datos aceptada', metadataKey: 'data_authorization_accepted' },
  { id: 'payment_information_reviewed', label: 'Información de pago revisada' },
];

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

const documentStatusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
};

const checkResultLabels: Record<string, string> = {
  PASSED: 'Aprobado',
  FAILED: 'Fallido',
  NEEDS_MORE_INFO: 'Necesita más información',
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

function hasTruthyMetadata(metadata: Record<string, unknown>, key?: string) {
  if (!key) {
    return false;
  }
  return metadata[key] === true || metadata[key] === 'true' || metadata[key] === 'accepted' || metadata[key] === 'verified';
}

export default async function AdminWorkerVerificationPage({ params }: PageProps) {
  const { supabase } = await requireAdmin();
  const { data: worker, error: workerError } = await supabase
    .from('worker_profiles')
    .select('id,profile_id,service_radius_km,verification_status,bio,experience_years,metadata')
    .eq('id', params.workerId)
    .single();

  if (workerError || !worker) {
    notFound();
  }

  const typedWorker = worker as WorkerProfile;
  const [{ data: profile, error: profileError }, { data: documents, error: documentsError }, { data: savedChecks, error: checksError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id,full_name,email,phone_number,city,metadata')
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
  const profileMetadata = typedProfile.metadata ?? {};
  const skills = readStringList(metadata.skills);
  const serviceAreas = readStringList(metadata.service_areas);
  const adminNotes = typeof metadata.admin_notes === 'string' ? metadata.admin_notes : '';
  const references = readText(metadata.references);
  const documentsByType = new Map(((documents ?? []) as WorkerDocument[]).map((document) => [document.document_type, document]));
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
          <p className="eyebrow">Verificación</p>
          <h1>{typedProfile.full_name}</h1>
          <p>
            {typedProfile.email} · {typedProfile.phone_number ?? 'Sin teléfono'}
          </p>
        </div>
        <div className="header-actions">
          <Link className="secondary-link" href={`/admin/workers/${typedWorker.id}`}>
            Volver al perfil
          </Link>
          <Link className="secondary-link" href="/admin/workers">
            Ver trabajadores
          </Link>
        </div>
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
              <dt>Radio</dt>
              <dd>{typedWorker.service_radius_km ?? 'No definido'} km</dd>
            </div>
          </dl>
        </article>

        <article className="admin-card">
          <h2>Habilidades y zonas</h2>
          <p className="admin-copy">{skills.length ? skills.join(', ') : 'Sin habilidades registradas.'}</p>
          <p className="admin-copy">{serviceAreas.length ? serviceAreas.join(', ') : 'Sin zonas registradas.'}</p>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Documentos cargados</h2>
          <div className="document-list">
            {((documents ?? []) as WorkerDocument[]).map((document) => (
              <a className="document-link" href={document.document_url} key={document.id} rel="noreferrer" target="_blank">
                <span>{documentLabels[document.document_type] ?? document.document_type}</span>
                <small>
                  {documentStatusLabels[document.status] ?? document.status}
                  {document.notes ? ` · ${document.notes}` : ''}
                </small>
              </a>
            ))}
            {!documents?.length ? <p className="admin-copy">No hay documentos cargados.</p> : null}
          </div>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Checklist de verificación</h2>
          <div className="check-list">
            {checklist.map((check) => {
              const savedCheck = latestChecks.get(check.id);
              const documentUploaded = check.documentType ? documentsByType.has(check.documentType) : false;
              const metadataComplete = hasTruthyMetadata(metadata, check.metadataKey) || hasTruthyMetadata(profileMetadata, check.metadataKey);
              const detected = documentUploaded || metadataComplete;

              return (
                <form action={saveVerificationCheck} className="check-row" key={check.id}>
                  <input name="workerProfileId" type="hidden" value={typedWorker.id} />
                  <input name="checkType" type="hidden" value={check.id} />
                  <div>
                    <strong>{check.label}</strong>
                    <small>
                      {savedCheck
                        ? `Último resultado: ${checkResultLabels[savedCheck.result] ?? savedCheck.result}`
                        : detected
                          ? 'Detectado en perfil'
                          : 'Sin revisar'}
                    </small>
                  </div>
                  <select defaultValue={savedCheck?.result ?? (detected ? 'PASSED' : 'NEEDS_MORE_INFO')} name="result">
                    <option value="PASSED">Aprobado</option>
                    <option value="FAILED">Fallido</option>
                    <option value="NEEDS_MORE_INFO">Necesita más información</option>
                  </select>
                  <input name="notes" placeholder="Notas internas del check" />
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
          <pre className="metadata-block">{references || 'Sin referencias registradas.'}</pre>
        </article>

        <article className="admin-card">
          <h2>Decisión</h2>
          <form action={decideWorkerApplication} className="decision-stack">
            <input name="workerProfileId" type="hidden" value={typedWorker.id} />
            <input name="reason" placeholder="Motivo obligatorio si rechaza o suspende" />
            <button className="primary-button" name="decision" type="submit" value="APPROVED">
              Aprobar trabajador
            </button>
            <button className="danger-button" name="decision" type="submit" value="REJECTED">
              Rechazar trabajador
            </button>
            <button className="warning-button" name="decision" type="submit" value="SUSPENDED">
              Suspender trabajador
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
