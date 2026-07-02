import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { closeDispute, requestDisputeInfo, saveDisputeNotes, updateDisputeStatus } from '../actions';
import { disputeAuditActionLabel, disputeStatusLabel, disputeStatuses, disputeTypeLabel, disputeTypes } from '../constants';
import { statusLabel as jobStatusLabel } from '../../jobs/constants';
import { requireAdmin } from '@/lib/supabase-server';

type PageProps = {
  params: Promise<{
    disputeId: string;
  }>;
};

type Dispute = {
  id: string;
  job_id: string;
  filed_by_profile_id: string;
  filed_against_profile_id: string;
  type: string | null;
  reason: string;
  status: string;
  resolution: string | null;
  internal_notes: string | null;
  created_at: string;
};

type Job = {
  id: string;
  service_request_id: string;
  customer_profile_id: string;
  worker_profile_id: string;
  category_id: string;
  status: string;
  total_amount: number | string | null;
};

type PersonProfile = {
  id: string;
  profile_id: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
};

type ServiceRequest = {
  id: string;
  city: string;
  address: string;
  details: string | null;
};

type Category = {
  id: string;
  name: string;
};

type Evidence = {
  id: string;
  file_url: string;
  file_type: string | null;
  description: string | null;
  uploaded_by_profile_id: string | null;
  created_at: string;
};

type Photo = {
  id: string;
  photo_url: string;
  description: string | null;
};

type AuditLog = {
  id: string;
  action: string;
  actor_profile_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function money(value: number | string | null) {
  const numberValue = typeof value === 'string' ? Number(value) : value;
  if (numberValue == null || Number.isNaN(numberValue)) {
    return '-';
  }
  return new Intl.NumberFormat('es-CO', {
    currency: 'COP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(numberValue);
}

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString('es-CO') : 'Sin registro';
}

function profileName(profileId: string | null, profilesById: Map<string, Profile>) {
  return profileId ? profilesById.get(profileId)?.full_name ?? 'Usuario' : 'Sistema';
}

export const dynamic = 'force-dynamic';

export default async function AdminDisputeDetailPage({ params }: PageProps) {
  const { disputeId } = await params;
  const { supabase } = await requireAdmin();
  const { data: dispute, error: disputeError } = await supabase
    .from('disputes')
    .select('id,job_id,filed_by_profile_id,filed_against_profile_id,type,reason,status,resolution,internal_notes,created_at')
    .eq('id', disputeId)
    .single();

  if (disputeError || !dispute) {
    notFound();
  }

  const typedDispute = dispute as Dispute;
  const [{ data: job }, { data: evidence }, { data: auditLogs }] = await Promise.all([
    supabase.from('jobs').select('id,service_request_id,customer_profile_id,worker_profile_id,category_id,status,total_amount').eq('id', typedDispute.job_id).single(),
    supabase.from('dispute_evidence').select('id,file_url,file_type,description,uploaded_by_profile_id,created_at').eq('dispute_id', typedDispute.id).order('created_at', { ascending: false }),
    supabase.from('audit_logs').select('id,action,actor_profile_id,metadata,created_at').eq('entity', 'disputes').eq('entity_id', typedDispute.id).order('created_at'),
  ]);

  const typedJob = job as Job | null;
  const [{ data: request }, { data: category }, { data: customer }, { data: worker }, { data: jobPhotos }] = await Promise.all([
    typedJob ? supabase.from('service_requests').select('id,city,address,details').eq('id', typedJob.service_request_id).single() : Promise.resolve({ data: null }),
    typedJob ? supabase.from('service_categories').select('id,name').eq('id', typedJob.category_id).single() : Promise.resolve({ data: null }),
    typedJob ? supabase.from('customer_profiles').select('id,profile_id').eq('id', typedJob.customer_profile_id).single() : Promise.resolve({ data: null }),
    typedJob ? supabase.from('worker_profiles').select('id,profile_id').eq('id', typedJob.worker_profile_id).single() : Promise.resolve({ data: null }),
    typedJob ? supabase.from('service_request_photos').select('id,photo_url,description').eq('service_request_id', typedJob.service_request_id) : Promise.resolve({ data: [] }),
  ]);

  const evidenceRows = (evidence ?? []) as Evidence[];
  const auditRows = (auditLogs ?? []) as AuditLog[];
  const profileIds = [
    typedDispute.filed_by_profile_id,
    typedDispute.filed_against_profile_id,
    (customer as PersonProfile | null)?.profile_id,
    (worker as PersonProfile | null)?.profile_id,
    ...evidenceRows.map((item) => item.uploaded_by_profile_id),
    ...auditRows.map((log) => log.actor_profile_id),
  ].filter((id): id is string => Boolean(id));
  const { data: profiles } = profileIds.length
    ? await supabase.from('profiles').select('id,full_name,email,phone_number').in('id', [...new Set(profileIds)])
    : { data: [] };

  const profilesById = new Map(((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile]));
  const customerProfile = (customer as PersonProfile | null)?.profile_id
    ? profilesById.get((customer as PersonProfile).profile_id)
    : null;
  const workerProfile = (worker as PersonProfile | null)?.profile_id ? profilesById.get((worker as PersonProfile).profile_id) : null;
  const typedRequest = request as ServiceRequest | null;

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Disputa</p>
          <h1>{disputeTypeLabel(typedDispute.type)}</h1>
          <p>
            {disputeStatusLabel(typedDispute.status)} · {(category as Category | null)?.name ?? 'Trabajo relacionado'}
          </p>
        </div>
        <Link className="secondary-link" href="/admin/disputes">
          Volver a disputas
        </Link>
      </section>

      <section className="admin-grid">
        <article className="admin-card">
          <h2>Resumen</h2>
          <dl className="detail-list">
            <div>
              <dt>Estado</dt>
              <dd className={`status-pill status-${typedDispute.status}`}>{disputeStatusLabel(typedDispute.status)}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{disputeTypeLabel(typedDispute.type)}</dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{dateTime(typedDispute.created_at)}</dd>
            </div>
            <div>
              <dt>Valor trabajo</dt>
              <dd>{money(typedJob?.total_amount ?? null)}</dd>
            </div>
          </dl>
        </article>

        <article className="admin-card">
          <h2>Trabajo relacionado</h2>
          <dl className="detail-list">
            <div>
              <dt>Estado</dt>
              <dd>{typedJob?.status ? jobStatusLabel(typedJob.status) : '-'}</dd>
            </div>
            <div>
              <dt>Ciudad</dt>
              <dd>{typedRequest?.city ?? '-'}</dd>
            </div>
            <div>
              <dt>Dirección</dt>
              <dd>{typedRequest?.address ?? '-'}</dd>
            </div>
          </dl>
          <Link className="secondary-link" href={`/admin/jobs/${typedDispute.job_id}`}>
            Abrir trabajo
          </Link>
        </article>

        <article className="admin-card">
          <h2>Cliente</h2>
          <dl className="detail-list">
            <div>
              <dt>Nombre</dt>
              <dd>{customerProfile?.full_name ?? 'Cliente'}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{customerProfile?.email ?? '-'}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{customerProfile?.phone_number ?? '-'}</dd>
            </div>
          </dl>
        </article>

        <article className="admin-card">
          <h2>Trabajador</h2>
          <dl className="detail-list">
            <div>
              <dt>Nombre</dt>
              <dd>{workerProfile?.full_name ?? 'Trabajador'}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{workerProfile?.email ?? '-'}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{workerProfile?.phone_number ?? '-'}</dd>
            </div>
          </dl>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Reporte</h2>
          <p className="admin-copy">{typedDispute.reason}</p>
          {typedRequest?.details ? <p className="admin-copy">Solicitud original: {typedRequest.details}</p> : null}
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Evidencia y fotos</h2>
          <div className="photo-grid">
            {evidenceRows.map((item) => (
              <a className="photo-tile" href={item.file_url} key={item.id} rel="noreferrer" target="_blank">
                {item.file_type?.startsWith('image') ? (
                  <Image alt={item.description ?? 'Evidencia de la disputa'} height={180} src={item.file_url} unoptimized width={240} />
                ) : (
                  <span>Abrir archivo</span>
                )}
                <span>
                  {item.description ?? 'Evidencia cargada'}
                  <small>{profileName(item.uploaded_by_profile_id, profilesById)}</small>
                </span>
              </a>
            ))}
            {((jobPhotos ?? []) as Photo[]).map((photo) => (
              <a className="photo-tile" href={photo.photo_url} key={photo.id} rel="noreferrer" target="_blank">
                <Image alt={photo.description ?? 'Foto del trabajo'} height={180} src={photo.photo_url} unoptimized width={240} />
                <span>{photo.description ?? 'Foto del trabajo'}</span>
              </a>
            ))}
            {!evidenceRows.length && !jobPhotos?.length ? <p className="admin-copy">No hay evidencia o fotos cargadas.</p> : null}
          </div>
        </article>

        <article className="admin-card">
          <h2>Notas internas</h2>
          <form action={saveDisputeNotes} className="form-stack">
            <input name="disputeId" type="hidden" value={typedDispute.id} />
            <label>
              Tipo de disputa
              <select defaultValue={typedDispute.type ?? 'other'} name="type">
                {disputeTypes.map((type) => (
                  <option key={type} value={type}>
                    {disputeTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <textarea className="admin-textarea" defaultValue={typedDispute.internal_notes ?? ''} name="internalNotes" />
            <button className="primary-button" type="submit">
              Guardar notas
            </button>
          </form>
        </article>

        <article className="admin-card">
          <h2>Estado y resolución</h2>
          <form action={updateDisputeStatus} className="form-stack">
            <input name="disputeId" type="hidden" value={typedDispute.id} />
            <label>
              Estado
              <select defaultValue={typedDispute.status} name="status">
                {disputeStatuses.map((status) => (
                  <option key={status} value={status}>
                    {disputeStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <textarea className="admin-textarea" defaultValue={typedDispute.resolution ?? ''} name="resolution" placeholder="Resolución o acuerdo administrativo" />
            <input name="statusNote" placeholder="Nota breve del cambio de estado" />
            <button className="warning-button" type="submit">
              Actualizar estado
            </button>
          </form>
        </article>

        <article className="admin-card">
          <h2>Solicitar información</h2>
          <form action={requestDisputeInfo} className="form-stack">
            <input name="disputeId" type="hidden" value={typedDispute.id} />
            <label>
              Solicitar a
              <select name="target">
                <option value="customer">Cliente</option>
                <option value="worker">Trabajador</option>
              </select>
            </label>
            <textarea className="admin-textarea" name="requestNote" placeholder="Información requerida" />
            <button className="small-action" type="submit">
              Solicitar más información
            </button>
          </form>
        </article>

        <article className="admin-card">
          <h2>Cerrar disputa</h2>
          <form action={closeDispute} className="form-stack">
            <input name="disputeId" type="hidden" value={typedDispute.id} />
            <textarea className="admin-textarea" name="resolution" placeholder="Resolución final obligatoria" required />
            <button className="danger-button" type="submit">
              Cerrar disputa
            </button>
          </form>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Auditoría</h2>
          <div className="timeline-list">
            {auditRows.map((log) => (
              <div className="timeline-item" key={log.id}>
                <strong>{disputeAuditActionLabel(log.action)}</strong>
                <span>{dateTime(log.created_at)}</span>
                <small>{profileName(log.actor_profile_id, profilesById)}</small>
              </div>
            ))}
            {!auditRows.length ? <p className="admin-copy">No hay auditoría registrada.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
