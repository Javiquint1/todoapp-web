import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cancelJob, closeJob, openJobDispute, overrideJobStatus } from '../actions';
import { jobStatuses, statusLabel } from '../constants';
import { requireAdmin } from '@/lib/supabase-server';

type PageProps = {
  params: {
    jobId: string;
  };
};

type Job = {
  id: string;
  service_request_id: string;
  quote_id: string | null;
  customer_profile_id: string;
  worker_profile_id: string;
  category_id: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  total_amount: number | string | null;
  commission_amount: number | string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type ServiceRequest = {
  id: string;
  city: string;
  address: string;
  details: string | null;
  status: string;
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
  city: string | null;
};

type Quote = {
  id: string;
  amount: number | string | null;
  labor_price: number | string | null;
  materials_estimate: number | string | null;
  diagnostic_fee: number | string | null;
  duration_minutes: number | null;
  notes: string | null;
  status: string;
};

type Photo = {
  id: string;
  photo_url: string;
  description: string | null;
};

type Message = {
  id: string;
  sender_profile_id: string;
  recipient_profile_id: string;
  message: string;
  created_at: string;
};

type AuditLog = {
  id: string;
  action: string;
  actor_profile_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type Dispute = {
  id: string;
  reason: string;
  status: string;
  resolution: string | null;
  created_at: string;
};

type Category = {
  id: string;
  name: string;
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

function profileName(profileId: string | null, profilesById: Map<string, Profile>) {
  return profileId ? profilesById.get(profileId)?.full_name ?? 'Usuario' : 'Sistema';
}

function dateTime(value: string | null) {
  return value ? new Date(value).toLocaleString('es-CO') : 'Sin registro';
}

export const dynamic = 'force-dynamic';

export default async function AdminJobDetailPage({ params }: PageProps) {
  const { supabase } = await requireAdmin();
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(
      'id,service_request_id,quote_id,customer_profile_id,worker_profile_id,category_id,scheduled_at,started_at,completed_at,status,total_amount,commission_amount,created_at,metadata',
    )
    .eq('id', params.jobId)
    .single();

  if (jobError || !job) {
    notFound();
  }

  const typedJob = job as Job;
  const [
    { data: request },
    { data: customer },
    { data: worker },
    { data: quote },
    { data: photos },
    { data: messages },
    { data: auditLogs },
    { data: disputes },
    { data: category },
  ] = await Promise.all([
    supabase.from('service_requests').select('id,city,address,details,status').eq('id', typedJob.service_request_id).single(),
    supabase.from('customer_profiles').select('id,profile_id').eq('id', typedJob.customer_profile_id).single(),
    supabase.from('worker_profiles').select('id,profile_id').eq('id', typedJob.worker_profile_id).single(),
    typedJob.quote_id
      ? supabase
          .from('job_quotes')
          .select('id,amount,labor_price,materials_estimate,diagnostic_fee,duration_minutes,notes,status')
          .eq('id', typedJob.quote_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase.from('service_request_photos').select('id,photo_url,description').eq('service_request_id', typedJob.service_request_id),
    supabase.from('job_messages').select('id,sender_profile_id,recipient_profile_id,message,created_at').eq('job_id', typedJob.id).order('created_at'),
    supabase.from('audit_logs').select('id,action,actor_profile_id,metadata,created_at').eq('entity', 'jobs').eq('entity_id', typedJob.id).order('created_at'),
    supabase.from('disputes').select('id,reason,status,resolution,created_at').eq('job_id', typedJob.id).order('created_at', { ascending: false }),
    supabase.from('service_categories').select('id,name').eq('id', typedJob.category_id).single(),
  ]);

  const typedCustomer = customer as PersonProfile | null;
  const typedWorker = worker as PersonProfile | null;
  const messageRows = (messages ?? []) as Message[];
  const auditRows = (auditLogs ?? []) as AuditLog[];
  const actorProfileIds = [
    typedCustomer?.profile_id,
    typedWorker?.profile_id,
    ...messageRows.flatMap((message) => [message.sender_profile_id, message.recipient_profile_id]),
    ...auditRows.map((log) => log.actor_profile_id),
  ].filter((id): id is string => Boolean(id));
  const { data: profiles } = actorProfileIds.length
    ? await supabase.from('profiles').select('id,full_name,email,phone_number,city').in('id', [...new Set(actorProfileIds)])
    : { data: [] };

  const profilesById = new Map(((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile]));
  const customerProfile = typedCustomer ? profilesById.get(typedCustomer.profile_id) : null;
  const workerProfile = typedWorker ? profilesById.get(typedWorker.profile_id) : null;
  const typedRequest = request as ServiceRequest | null;
  const typedQuote = quote as Quote | null;
  const timeline = [
    { label: 'Trabajo creado', value: typedJob.created_at },
    { label: 'Programado', value: typedJob.scheduled_at },
    { label: 'Inicio registrado', value: typedJob.started_at },
    { label: 'Finalización registrada', value: typedJob.completed_at },
    ...auditRows.map((log) => ({
      label: `Auditoría: ${log.action}`,
      value: log.created_at,
      note: profileName(log.actor_profile_id, profilesById),
    })),
  ].filter((entry) => entry.value);

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Trabajo</p>
          <h1>{(category as Category | null)?.name ?? 'Trabajo'}</h1>
          <p>
            {typedRequest?.city ?? 'Sin ciudad'} · {statusLabel(typedJob.status)}
          </p>
        </div>
        <Link className="secondary-link" href="/admin/jobs">
          Volver a trabajos
        </Link>
      </section>

      <section className="admin-grid">
        <article className="admin-card">
          <h2>Resumen</h2>
          <dl className="detail-list">
            <div>
              <dt>Estado</dt>
              <dd className={`status-pill status-${typedJob.status}`}>{statusLabel(typedJob.status)}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{money(typedJob.total_amount)}</dd>
            </div>
            <div>
              <dt>Comisión</dt>
              <dd>{money(typedJob.commission_amount)}</dd>
            </div>
            <div>
              <dt>Programación</dt>
              <dd>{dateTime(typedJob.scheduled_at)}</dd>
            </div>
          </dl>
        </article>

        <article className="admin-card">
          <h2>Dirección y solicitud</h2>
          <p className="admin-copy">{typedRequest?.address ?? 'Sin dirección registrada.'}</p>
          <p className="admin-copy">{typedRequest?.details ?? 'Sin detalles adicionales.'}</p>
          <Link className="secondary-link" href={`/admin/service-requests/${typedJob.service_request_id}`}>
            Abrir solicitud relacionada
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
          <h2>Trabajador asignado</h2>
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
          <h2>Cotización aceptada</h2>
          {typedQuote ? (
            <div className="quote-comparison-grid">
              <span>
                Mano de obra
                <strong>{money(typedQuote.labor_price ?? typedQuote.amount)}</strong>
              </span>
              <span>
                Materiales
                <strong>{money(typedQuote.materials_estimate)}</strong>
              </span>
              <span>
                Diagnóstico
                <strong>{money(typedQuote.diagnostic_fee)}</strong>
              </span>
              <span>
                Duración
                <strong>{typedQuote.duration_minutes ? `${typedQuote.duration_minutes} min` : '-'}</strong>
              </span>
              <p className="admin-copy">{typedQuote.notes ?? 'Sin notas del trabajador.'}</p>
            </div>
          ) : (
            <p className="admin-copy">Este trabajo no tiene cotización aceptada asociada.</p>
          )}
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Línea de tiempo</h2>
          <div className="timeline-list">
            {timeline.map((entry) => (
              <div className="timeline-item" key={`${entry.label}-${entry.value}`}>
                <strong>{entry.label}</strong>
                <span>{dateTime(entry.value)}</span>
                {'note' in entry && entry.note ? <small>{entry.note}</small> : null}
              </div>
            ))}
            {!timeline.length ? <p className="admin-copy">No hay eventos registrados.</p> : null}
          </div>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Fotos del trabajo</h2>
          <div className="photo-grid">
            {((photos ?? []) as Photo[]).map((photo) => (
              <a className="photo-tile" href={photo.photo_url} key={photo.id} rel="noreferrer" target="_blank">
                <Image alt={photo.description ?? 'Foto del trabajo'} height={180} src={photo.photo_url} unoptimized width={240} />
                <span>{photo.description ?? 'Abrir foto'}</span>
              </a>
            ))}
            {!photos?.length ? <p className="admin-copy">No hay fotos cargadas.</p> : null}
          </div>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Mensajes y comentarios</h2>
          <div className="message-list">
            {messageRows.map((message) => (
              <div className="message-item" key={message.id}>
                <strong>
                  {profileName(message.sender_profile_id, profilesById)} a {profileName(message.recipient_profile_id, profilesById)}
                </strong>
                <span>{dateTime(message.created_at)}</span>
                <p>{message.message}</p>
              </div>
            ))}
            {!messageRows.length ? <p className="admin-copy">No hay mensajes registrados.</p> : null}
          </div>
        </article>

        <article className="admin-card">
          <h2>Anular estado</h2>
          <form action={overrideJobStatus} className="form-stack">
            <input name="jobId" type="hidden" value={typedJob.id} />
            <label>
              Nuevo estado
              <select defaultValue={typedJob.status} name="status">
                {jobStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <textarea className="admin-textarea" name="reason" placeholder="Motivo administrativo obligatorio" required />
            <button className="warning-button" type="submit">
              Actualizar estado con motivo
            </button>
          </form>
        </article>

        <article className="admin-card">
          <h2>Acciones administrativas</h2>
          <form action={cancelJob} className="form-stack">
            <input name="jobId" type="hidden" value={typedJob.id} />
            <textarea className="admin-textarea" name="reason" placeholder="Motivo obligatorio para cancelar" required />
            <button className="danger-button" type="submit">
              Cancelar trabajo
            </button>
          </form>
          <form action={closeJob} className="form-stack job-action-form">
            <input name="jobId" type="hidden" value={typedJob.id} />
            <textarea className="admin-textarea" name="reason" placeholder="Motivo obligatorio para cerrar" required />
            <button className="small-action" type="submit">
              Cerrar trabajo
            </button>
          </form>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Disputas</h2>
          <form action={openJobDispute} className="quote-admin-form quote-admin-form-stacked">
            <input name="jobId" type="hidden" value={typedJob.id} />
            <textarea className="admin-textarea" name="reason" placeholder="Motivo obligatorio para abrir disputa" required />
            <button className="warning-button" type="submit">
              Abrir disputa
            </button>
          </form>
          <div className="message-list">
            {((disputes ?? []) as Dispute[]).map((dispute) => (
              <div className="message-item" key={dispute.id}>
                <strong>{dispute.status}</strong>
                <span>{dateTime(dispute.created_at)}</span>
                <p>{dispute.reason}</p>
                {dispute.resolution ? <small>{dispute.resolution}</small> : null}
              </div>
            ))}
            {!disputes?.length ? <p className="admin-copy">No hay disputas abiertas para este trabajo.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
