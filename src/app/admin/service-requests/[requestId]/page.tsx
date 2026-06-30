import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/supabase-server';
import { assignWorkersToServiceRequest, saveServiceRequestNotes, updateServiceRequestStatus } from '../actions';

type PageProps = {
  params: {
    requestId: string;
  };
  searchParams?: {
    workerSearch?: string;
    workerSkill?: string;
    workerCity?: string;
    workerAvailability?: string;
  };
};

type ServiceRequest = {
  id: string;
  city: string;
  address: string;
  details: string | null;
  status: string;
  scheduled_at: string | null;
  customer_profile_id: string;
  category_id: string;
  subcategory_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type CustomerProfile = {
  id: string;
  profile_id: string;
  address: string | null;
  preferred_payment_method: string | null;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  city: string | null;
  status: string;
};

type Category = {
  id: string;
  name: string;
};

type Photo = {
  id: string;
  photo_url: string;
  description: string | null;
};

type WorkerProfile = {
  id: string;
  profile_id: string;
  experience_years: number | null;
  service_radius_km: number | null;
  metadata: Record<string, unknown> | null;
};

type Assignment = {
  worker_profile_id: string;
  status: string;
  created_at: string;
  assignment_note: string | null;
};

type Quote = {
  id: string;
  worker_profile_id: string;
  amount: number | string | null;
  labor_price: number | string | null;
  materials_estimate: number | string | null;
  diagnostic_fee: number | string | null;
  duration_minutes: number | null;
  notes: string | null;
  status: string;
  created_at: string;
};

const requestStatuses = [
  'requested',
  'reviewing',
  'assigned',
  'quoted',
  'accepted',
  'scheduled',
  'in_progress',
  'completed',
  'disputed',
  'cancelled',
  'closed',
];

const urgencyOptions = ['low', 'normal', 'high', 'urgent'];

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

const availabilityLabels: Record<string, string> = {
  available: 'Disponible',
  busy: 'Ocupado',
  offline: 'Desconectado',
  unknown: 'Sin dato',
};

function statusLabel(status: string) {
  return requestStatusLabels[status] ?? status;
}

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

function readStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function readMetadataString(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : '';
}

function isWorkerAvailable(metadata: Record<string, unknown> | null) {
  const availability = readMetadataString(metadata, 'availability_status').toLowerCase();
  const available = metadata?.available;
  return availability === 'available' || availability === 'open' || availability === 'active' || available === true;
}

function workerMatchesText(values: string[], needle: string) {
  if (!needle) {
    return true;
  }
  const normalizedNeedle = needle.toLowerCase();
  return values.some((value) => value.toLowerCase().includes(normalizedNeedle));
}

export const dynamic = 'force-dynamic';

export default async function AdminServiceRequestDetailPage({ params, searchParams }: PageProps) {
  const { supabase } = await requireAdmin();
  const { data: request, error: requestError } = await supabase
    .from('service_requests')
    .select('id,city,address,details,status,scheduled_at,customer_profile_id,category_id,subcategory_id,created_at,metadata')
    .eq('id', params.requestId)
    .single();

  if (requestError || !request) {
    notFound();
  }

  const typedRequest = request as ServiceRequest;

  const [
    { data: category },
    { data: subcategory },
    { data: customer, error: customerError },
    { data: photos, error: photosError },
    { data: workers, error: workersError },
    { data: assignments, error: assignmentsError },
    { data: quotes, error: quotesError },
  ] = await Promise.all([
    supabase.from('service_categories').select('id,name').eq('id', typedRequest.category_id).single(),
    typedRequest.subcategory_id
      ? supabase.from('service_subcategories').select('id,name').eq('id', typedRequest.subcategory_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('customer_profiles')
      .select('id,profile_id,address,preferred_payment_method')
      .eq('id', typedRequest.customer_profile_id)
      .single(),
    supabase
      .from('service_request_photos')
      .select('id,photo_url,description')
      .eq('service_request_id', typedRequest.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('worker_profiles')
      .select('id,profile_id,experience_years,service_radius_km,metadata')
      .eq('verification_status', 'APPROVED')
      .order('created_at', { ascending: false }),
    supabase
      .from('service_request_assignments')
      .select('worker_profile_id,status,created_at,assignment_note')
      .eq('service_request_id', typedRequest.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('job_quotes')
      .select('id,worker_profile_id,amount,labor_price,materials_estimate,diagnostic_fee,duration_minutes,notes,status,created_at')
      .eq('service_request_id', typedRequest.id)
      .order('created_at', { ascending: false }),
  ]);

  if (customerError || photosError || workersError || assignmentsError || quotesError) {
    throw new Error(
      customerError?.message ||
        photosError?.message ||
        workersError?.message ||
        assignmentsError?.message ||
        quotesError?.message,
    );
  }

  const typedCustomer = customer as CustomerProfile;
  const workerRows = (workers ?? []) as WorkerProfile[];
  const assignmentRows = (assignments ?? []) as Assignment[];
  const quoteRows = (quotes ?? []) as Quote[];
  const assignmentWorkerIds = new Set(assignmentRows.map((assignment) => assignment.worker_profile_id));
  const profileIds = [
    typedCustomer.profile_id,
    ...workerRows.map((worker) => worker.profile_id),
  ];

  const { data: profiles, error: profilesError } = profileIds.length
    ? await supabase.from('profiles').select('id,full_name,email,phone_number,city,status').in('id', [...new Set(profileIds)])
    : { data: [], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profilesById = new Map(((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile]));
  const workersById = new Map(workerRows.map((worker) => [worker.id, worker]));
  const workerProfileIdToProfile = new Map(
    workerRows.map((worker) => [worker.id, profilesById.get(worker.profile_id)]),
  );
  const customerProfile = profilesById.get(typedCustomer.profile_id);
  const workerIds = workerRows.map((worker) => worker.id);
  const workerProfileIds = workerRows.map((worker) => worker.profile_id);
  const [{ data: completedJobs }, { data: reviews }] = await Promise.all([
    workerIds.length
      ? supabase.from('jobs').select('worker_profile_id').in('worker_profile_id', workerIds).eq('status', 'COMPLETED')
      : Promise.resolve({ data: [] }),
    workerProfileIds.length
      ? supabase.from('reviews').select('reviewee_profile_id,rating').in('reviewee_profile_id', workerProfileIds).eq('status', 'PUBLISHED')
      : Promise.resolve({ data: [] }),
  ]);
  const completedCountByWorkerId = new Map<string, number>();
  for (const job of (completedJobs ?? []) as { worker_profile_id: string }[]) {
    completedCountByWorkerId.set(job.worker_profile_id, (completedCountByWorkerId.get(job.worker_profile_id) ?? 0) + 1);
  }
  const ratingAccumulator = new Map<string, { sum: number; count: number }>();
  for (const review of (reviews ?? []) as { reviewee_profile_id: string; rating: number }[]) {
    const current = ratingAccumulator.get(review.reviewee_profile_id) ?? { sum: 0, count: 0 };
    ratingAccumulator.set(review.reviewee_profile_id, { sum: current.sum + review.rating, count: current.count + 1 });
  }
  const workerSearch = searchParams?.workerSearch?.trim() ?? '';
  const workerSkill = searchParams?.workerSkill?.trim() ?? '';
  const workerCity = searchParams?.workerCity?.trim() ?? '';
  const workerAvailability = searchParams?.workerAvailability?.trim() ?? '';
  const filteredWorkers = workerRows.filter((worker) => {
    const profile = profilesById.get(worker.profile_id);
    const skills = readStringList(worker.metadata?.skills);
    const serviceAreas = readStringList(worker.metadata?.service_areas);
    const neighborhoods = readStringList(worker.metadata?.neighborhoods);
    const availability = readMetadataString(worker.metadata, 'availability_status');

    return (
      workerMatchesText([profile?.full_name ?? '', profile?.email ?? '', profile?.phone_number ?? ''], workerSearch) &&
      workerMatchesText([...(skills.length ? skills : []), (category as Category | null)?.name ?? ''], workerSkill) &&
      workerMatchesText([profile?.city ?? '', ...serviceAreas, ...neighborhoods], workerCity) &&
      (!workerAvailability ||
        availability.toLowerCase() === workerAvailability.toLowerCase() ||
        (workerAvailability === 'available' && isWorkerAvailable(worker.metadata)))
    );
  });
  const metadata = typedRequest.metadata ?? {};
  const internalNotes = typeof metadata.internal_notes === 'string' ? metadata.internal_notes : '';
  const urgency = typeof metadata.urgency === 'string' ? metadata.urgency : 'normal';

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Solicitud de servicio</p>
          <h1>{(category as Category | null)?.name ?? 'Solicitud de servicio'}</h1>
          <p>
            {typedRequest.city} · {typedRequest.address}
          </p>
        </div>
        <Link className="secondary-link" href="/admin/service-requests">
          Volver a solicitudes
        </Link>
      </section>

      <section className="admin-grid">
        <article className="admin-card">
          <h2>Resumen</h2>
          <dl className="detail-list">
            <div>
              <dt>Estado</dt>
              <dd className={`status-pill status-${typedRequest.status}`}>{statusLabel(typedRequest.status)}</dd>
            </div>
            <div>
              <dt>Urgencia</dt>
              <dd>{urgency}</dd>
            </div>
            <div>
              <dt>Categoría</dt>
              <dd>{(category as Category | null)?.name ?? '-'}</dd>
            </div>
            <div>
              <dt>Subcategoría</dt>
              <dd>{(subcategory as Category | null)?.name ?? '-'}</dd>
            </div>
            <div>
              <dt>Fecha deseada</dt>
              <dd>{typedRequest.scheduled_at ? new Date(typedRequest.scheduled_at).toLocaleString('es-CO') : 'Sin programar'}</dd>
            </div>
          </dl>
        </article>

        <article className="admin-card">
          <h2>Perfil del cliente</h2>
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
            <div>
              <dt>Estado</dt>
              <dd>{customerProfile?.status ?? '-'}</dd>
            </div>
          </dl>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Detalles de dirección</h2>
          <p className="admin-copy">{typedRequest.address}</p>
          <p className="admin-copy">{typedCustomer.address ? `Dirección guardada del cliente: ${typedCustomer.address}` : 'El cliente no tiene una dirección guardada.'}</p>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Detalles de la solicitud</h2>
          <p className="admin-copy">{typedRequest.details ?? 'Sin detalles adicionales.'}</p>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Fotos cargadas</h2>
          <div className="photo-grid">
            {((photos ?? []) as Photo[]).map((photo) => (
              <a className="photo-tile" href={photo.photo_url} key={photo.id} rel="noreferrer" target="_blank">
                <Image
                  alt={photo.description ?? 'Foto de la solicitud'}
                  height={180}
                  src={photo.photo_url}
                  unoptimized
                  width={240}
                />
                <span>{photo.description ?? 'Abrir foto'}</span>
              </a>
            ))}
            {!photos?.length ? <p className="admin-copy">No hay fotos cargadas.</p> : null}
          </div>
        </article>

        <article className="admin-card">
          <h2>Estado</h2>
          <form action={updateServiceRequestStatus} className="form-stack">
            <input name="serviceRequestId" type="hidden" value={typedRequest.id} />
            <label>
              Estado de la solicitud
              <select defaultValue={typedRequest.status} name="status">
                {requestStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" type="submit">
              Actualizar estado
            </button>
          </form>
        </article>

        <article className="admin-card">
          <h2>Notas internas</h2>
          <form action={saveServiceRequestNotes} className="form-stack">
            <input name="serviceRequestId" type="hidden" value={typedRequest.id} />
            <label>
              Urgencia
              <select defaultValue={urgency} name="urgency">
                {urgencyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <textarea className="admin-textarea" defaultValue={internalNotes} name="internalNotes" />
            <button className="primary-button" type="submit">
              Guardar notas
            </button>
          </form>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Asignación manual de trabajadores</h2>
          <form className="filter-panel assignment-filter-panel">
            <label>
              Buscar
              <input defaultValue={workerSearch} name="workerSearch" placeholder="Nombre, correo, teléfono" />
            </label>
            <label>
              Categoría / habilidad
              <input defaultValue={workerSkill} name="workerSkill" placeholder={(category as Category | null)?.name ?? 'Habilidad'} />
            </label>
            <label>
              Ciudad / barrio
              <input defaultValue={workerCity} name="workerCity" placeholder={typedRequest.city} />
            </label>
            <label>
              Disponibilidad
              <select defaultValue={workerAvailability} name="workerAvailability">
                <option value="">Cualquiera</option>
                <option value="available">Disponible</option>
                <option value="busy">Ocupado</option>
                <option value="offline">Desconectado</option>
              </select>
            </label>
            <div className="filter-links">
              <button className="small-action" type="submit">
                Buscar trabajadores
              </button>
              <Link className="secondary-link" href={`/admin/service-requests/${typedRequest.id}`}>
                Limpiar
              </Link>
            </div>
          </form>
          <form action={assignWorkersToServiceRequest} className="assignment-list">
            <input name="serviceRequestId" type="hidden" value={typedRequest.id} />
            <label className="assignment-note-field">
              Nota de asignación
              <textarea
                className="admin-textarea"
                name="assignmentNote"
                placeholder="Visible después en los flujos del trabajador. No incluyas datos privados de dirección del cliente."
              />
            </label>
            {filteredWorkers.map((worker) => {
              const profile = profilesById.get(worker.profile_id);
              const assigned = assignmentWorkerIds.has(worker.id);
              const skills = readStringList(worker.metadata?.skills);
              const serviceAreas = readStringList(worker.metadata?.service_areas);
              const neighborhoods = readStringList(worker.metadata?.neighborhoods);
              const rating = ratingAccumulator.get(worker.profile_id);
              const averageRating = rating && rating.count ? (rating.sum / rating.count).toFixed(1) : 'Sin calificación';
              const completedJobsCount = completedCountByWorkerId.get(worker.id) ?? 0;
              const availability = readMetadataString(worker.metadata, 'availability_status') || (isWorkerAvailable(worker.metadata) ? 'available' : 'unknown');
              const availabilityLabel = availabilityLabels[availability.toLowerCase()] ?? availability;

              return (
                <label className="assignment-row assignment-row-rich" key={worker.id}>
                  <input defaultChecked={assigned} name="workerProfileIds" type="checkbox" value={worker.id} />
                  <span>
                    {profile?.full_name ?? 'Trabajador'}
                    <small>
                      {profile?.city ?? 'Sin ciudad'} · {worker.experience_years ?? 0} años · {worker.service_radius_km ?? 'Sin radio'} km
                    </small>
                    <small>
                      Calificación: {averageRating} · Trabajos completados: {completedJobsCount} · Disponibilidad: {availabilityLabel}
                    </small>
                    <small>
                      Habilidades: {skills.length ? skills.join(', ') : 'Sin registrar'} · Zonas:{' '}
                      {[...serviceAreas, ...neighborhoods].length ? [...serviceAreas, ...neighborhoods].join(', ') : 'Sin registrar'}
                    </small>
                  </span>
                </label>
              );
            })}
            {!filteredWorkers.length ? <p className="empty-state">No hay trabajadores aprobados que coincidan con estos filtros.</p> : null}
            <button className="primary-button" type="submit">
              Guardar asignaciones
            </button>
          </form>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Trabajadores asignados</h2>
          <div className="admin-table embedded-table">
            <div className="admin-row admin-row-head">
              <span>Trabajador</span>
              <span>Ciudad</span>
              <span>Estado</span>
              <span>Asignado</span>
              <span>Perfil</span>
            </div>
            {assignmentRows.map((assignment) => {
              const worker = workersById.get(assignment.worker_profile_id);
              const profile = worker ? profilesById.get(worker.profile_id) : null;
              return (
                <div className="admin-row" key={assignment.worker_profile_id}>
                  <span>{profile?.full_name ?? 'Trabajador'}</span>
                  <span>{profile?.city ?? '-'}</span>
                  <span>{assignment.status}</span>
                  <span>
                    {new Date(assignment.created_at).toLocaleDateString('es-CO')}
                    <small>{assignment.assignment_note ?? 'Sin nota'}</small>
                  </span>
                  <Link className="secondary-link" href={`/admin/workers/${assignment.worker_profile_id}`}>
                    Abrir
                  </Link>
                </div>
              );
            })}
            {!assignmentRows.length ? <p className="empty-state">No hay trabajadores asignados.</p> : null}
          </div>
        </article>

        <article className="admin-card admin-card-wide">
          <div className="section-heading-row">
            <h2>Cotizaciones de trabajadores</h2>
            <Link className="secondary-link" href={`/admin/service-requests/${typedRequest.id}/quotes`}>
              Comparar cotizaciones
            </Link>
          </div>
          <div className="admin-table embedded-table">
            <div className="admin-row admin-row-head quote-row">
              <span>Trabajador</span>
              <span>Mano de obra</span>
              <span>Materiales</span>
              <span>Estado</span>
              <span>Notas</span>
            </div>
            {quoteRows.map((quote) => {
              const profile = workerProfileIdToProfile.get(quote.worker_profile_id);
              return (
                <div className="admin-row quote-row" key={quote.id}>
                  <span>
                    {profile?.full_name ?? 'Trabajador'}
                    <small>{new Date(quote.created_at).toLocaleString('es-CO')}</small>
                  </span>
                  <span>
                    {money(quote.labor_price ?? quote.amount)}
                    <small>Diagnóstico: {money(quote.diagnostic_fee)}</small>
                  </span>
                  <span>
                    {money(quote.materials_estimate)}
                    <small>{quote.duration_minutes ? `${quote.duration_minutes} min` : 'Sin duración'}</small>
                  </span>
                  <span className={`status-pill status-${quote.status.toLowerCase()}`}>{quote.status}</span>
                  <span>{quote.notes ?? '-'}</span>
                </div>
              );
            })}
            {!quoteRows.length ? <p className="empty-state">Aún no hay cotizaciones enviadas.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
