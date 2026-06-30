import Link from 'next/link';
import { acceptQuoteWithAdminOverride, updateQuoteAdminReview } from './actions';
import { requireAdmin } from '@/lib/supabase-server';

type Quote = {
  id: string;
  service_request_id: string;
  worker_profile_id: string;
  amount: number | string | null;
  labor_price: number | string | null;
  materials_estimate: number | string | null;
  diagnostic_fee: number | string | null;
  duration_minutes: number | null;
  notes: string | null;
  status: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type ServiceRequest = {
  id: string;
  city: string;
  address: string;
  status: string;
  category_id: string;
  customer_profile_id: string;
};

type WorkerProfile = {
  id: string;
  profile_id: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
};

type Category = {
  id: string;
  name: string;
};

const quoteStatuses = ['submitted', 'reviewed', 'rejected', 'expired', 'cancelled'];

const quoteStatusLabels: Record<string, string> = {
  submitted: 'Enviada',
  reviewed: 'Revisada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Expirada',
  cancelled: 'Cancelada',
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

function metadataText(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : '';
}

export const dynamic = 'force-dynamic';

export default async function AdminQuotesPage() {
  const { supabase } = await requireAdmin();
  const { data: quotes, error: quotesError } = await supabase
    .from('job_quotes')
    .select(
      'id,service_request_id,worker_profile_id,amount,labor_price,materials_estimate,diagnostic_fee,duration_minutes,notes,status,created_at,metadata',
    )
    .order('created_at', { ascending: false });

  if (quotesError) {
    throw new Error(quotesError.message);
  }

  const quoteRows = (quotes ?? []) as Quote[];
  const requestIds = [...new Set(quoteRows.map((quote) => quote.service_request_id))];
  const workerIds = [...new Set(quoteRows.map((quote) => quote.worker_profile_id))];

  const [{ data: requests }, { data: workers }] = await Promise.all([
    requestIds.length
      ? supabase.from('service_requests').select('id,city,address,status,category_id,customer_profile_id').in('id', requestIds)
      : Promise.resolve({ data: [] }),
    workerIds.length ? supabase.from('worker_profiles').select('id,profile_id').in('id', workerIds) : Promise.resolve({ data: [] }),
  ]);

  const requestRows = (requests ?? []) as ServiceRequest[];
  const workerRows = (workers ?? []) as WorkerProfile[];
  const profileIds = [...new Set(workerRows.map((worker) => worker.profile_id))];
  const categoryIds = [...new Set(requestRows.map((request) => request.category_id))];

  const [{ data: profiles }, { data: categories }] = await Promise.all([
    profileIds.length ? supabase.from('profiles').select('id,full_name,email').in('id', profileIds) : Promise.resolve({ data: [] }),
    categoryIds.length ? supabase.from('service_categories').select('id,name').in('id', categoryIds) : Promise.resolve({ data: [] }),
  ]);

  const requestById = new Map(requestRows.map((request) => [request.id, request]));
  const workerById = new Map(workerRows.map((worker) => [worker.id, worker]));
  const profileById = new Map(((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile]));
  const categoryById = new Map(((categories ?? []) as Category[]).map((category) => [category.id, category]));

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Cotizaciones</p>
          <h1>Monitoreo de cotizaciones</h1>
          <p>Monitorea cotizaciones de trabajadores, revisa precios y marca las que requieren atención administrativa.</p>
        </div>
        <Link className="secondary-link" href="/admin">
          Volver al panel
        </Link>
      </section>

      <section className="quote-monitor-list">
        {quoteRows.map((quote) => {
          const request = requestById.get(quote.service_request_id);
          const worker = workerById.get(quote.worker_profile_id);
          const profile = worker ? profileById.get(worker.profile_id) : null;
          const category = request ? categoryById.get(request.category_id) : null;
          const adminNote = metadataText(quote.metadata, 'admin_note');
          const isHidden = quote.metadata?.is_hidden === true;
          const isFlagged = quote.metadata?.is_flagged === true;

          return (
            <article className="admin-card admin-card-wide quote-card" key={quote.id}>
              <div className="quote-card-header">
                <div>
                  <h2>{profile?.full_name ?? 'Cotización del trabajador'}</h2>
                  <p className="admin-copy">
                    {category?.name ?? 'Servicio'} · {request?.city ?? '-'} ·{' '}
                    <Link className="secondary-link" href={`/admin/service-requests/${quote.service_request_id}/quotes`}>
                      Comparar cotizaciones de la solicitud
                    </Link>
                  </p>
                </div>
                <span className={`status-pill status-${quote.status}`}>{quoteStatusLabels[quote.status] ?? quote.status}</span>
              </div>

              <div className="quote-comparison-grid">
                <span>
                  Mano de obra
                  <strong>{money(quote.labor_price ?? quote.amount)}</strong>
                </span>
                <span>
                  Materiales
                  <strong>{money(quote.materials_estimate)}</strong>
                </span>
                <span>
                  Diagnóstico
                  <strong>{money(quote.diagnostic_fee)}</strong>
                </span>
                <span>
                  Duración
                  <strong>{quote.duration_minutes ? `${quote.duration_minutes} min` : '-'}</strong>
                </span>
              </div>

              <p className="metadata-block">{quote.notes || 'Sin notas del trabajador.'}</p>
              {(isHidden || isFlagged || adminNote) && (
                <p className="admin-copy">
                  {isHidden ? 'Oculta · ' : ''}
                  {isFlagged ? 'Marcada · ' : ''}
                  {adminNote || ''}
                </p>
              )}

              <form action={updateQuoteAdminReview} className="quote-admin-form">
                <input name="quoteId" type="hidden" value={quote.id} />
                <select defaultValue={quote.status === 'accepted' ? 'reviewed' : quote.status} name="status">
                  {quoteStatuses.map((status) => (
                    <option key={status} value={status}>
                      {quoteStatusLabels[status] ?? status}
                    </option>
                  ))}
                </select>
                <select defaultValue={isHidden ? 'hidden' : isFlagged ? 'flagged' : 'clear'} name="moderation">
                  <option value="clear">Visible</option>
                  <option value="flagged">Marcar como inapropiada</option>
                  <option value="hidden">Ocultar cotización</option>
                </select>
                <input defaultValue={adminNote} name="adminNote" placeholder="Nota interna administrativa" />
                <button className="small-action" type="submit">
                  Guardar revisión
                </button>
              </form>

              <form action={acceptQuoteWithAdminOverride} className="quote-admin-form">
                <input name="quoteId" type="hidden" value={quote.id} />
                <input name="overrideReason" placeholder="Motivo obligatorio de la anulación administrativa" />
                <button className="warning-button" type="submit">
                  Aceptar con anulación admin
                </button>
              </form>
            </article>
          );
        })}
        {!quoteRows.length ? <p className="empty-state">Aún no hay cotizaciones enviadas.</p> : null}
      </section>
    </main>
  );
}
