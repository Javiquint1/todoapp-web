import Link from 'next/link';
import { notFound } from 'next/navigation';
import { acceptQuoteWithAdminOverride, updateQuoteAdminReview } from '../../../quotes/actions';
import { requireAdmin } from '@/lib/supabase-server';

type PageProps = {
  params: Promise<{
    requestId: string;
  }>;
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
  metadata: Record<string, unknown> | null;
};

type WorkerProfile = {
  id: string;
  profile_id: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  city: string | null;
};

type ServiceRequest = {
  id: string;
  city: string;
  address: string;
  status: string;
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

export default async function RequestQuotesPage({ params }: PageProps) {
  const { requestId } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: request, error: requestError }, { data: quotes, error: quotesError }] = await Promise.all([
    supabase.from('service_requests').select('id,city,address,status').eq('id', requestId).single(),
    supabase
      .from('job_quotes')
      .select(
        'id,worker_profile_id,amount,labor_price,materials_estimate,diagnostic_fee,duration_minutes,notes,status,created_at,metadata',
      )
      .eq('service_request_id', requestId)
      .order('labor_price', { ascending: true }),
  ]);

  if (requestError || !request) {
    notFound();
  }
  if (quotesError) {
    throw new Error(quotesError.message);
  }

  const quoteRows = (quotes ?? []) as Quote[];
  const workerIds = [...new Set(quoteRows.map((quote) => quote.worker_profile_id))];
  const { data: workers } = workerIds.length
    ? await supabase.from('worker_profiles').select('id,profile_id').in('id', workerIds)
    : { data: [] };
  const workerRows = (workers ?? []) as WorkerProfile[];
  const profileIds = workerRows.map((worker) => worker.profile_id);
  const { data: profiles } = profileIds.length
    ? await supabase.from('profiles').select('id,full_name,email,city').in('id', profileIds)
    : { data: [] };

  const workerById = new Map(workerRows.map((worker) => [worker.id, worker]));
  const profileById = new Map(((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile]));
  const typedRequest = request as ServiceRequest;

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Comparación de cotizaciones</p>
          <h1>Cotizaciones de la solicitud</h1>
          <p>
            {typedRequest.city} · {typedRequest.status}
          </p>
        </div>
        <div className="header-actions">
          <Link className="secondary-link" href={`/admin/service-requests/${requestId}`}>
            Volver a la solicitud
          </Link>
          <Link className="secondary-link" href="/admin/quotes">
            Todas las cotizaciones
          </Link>
        </div>
      </section>

      <section className="admin-table">
        <div className="admin-row admin-row-head quote-compare-row">
          <span>Trabajador</span>
          <span>Mano de obra</span>
          <span>Materiales</span>
          <span>Diagnóstico</span>
          <span>Estado</span>
          <span>Administrador</span>
        </div>
        {quoteRows.map((quote) => {
          const worker = workerById.get(quote.worker_profile_id);
          const profile = worker ? profileById.get(worker.profile_id) : null;
          const adminNote = metadataText(quote.metadata, 'admin_note');
          const isHidden = quote.metadata?.is_hidden === true;
          const isFlagged = quote.metadata?.is_flagged === true;

          return (
            <div className="admin-row quote-compare-row" key={quote.id}>
              <span>
                <strong>{profile?.full_name ?? 'Trabajador'}</strong>
                <small>{profile?.city ?? profile?.email ?? '-'}</small>
              </span>
              <span>
                {money(quote.labor_price ?? quote.amount)}
                <small>{quote.duration_minutes ? `${quote.duration_minutes} min` : 'Sin duración'}</small>
              </span>
              <span>{money(quote.materials_estimate)}</span>
              <span>{money(quote.diagnostic_fee)}</span>
              <span>
                <span className={`status-pill status-${quote.status}`}>{quoteStatusLabels[quote.status] ?? quote.status}</span>
                <small>
                  {isHidden ? 'Oculta ' : ''}
                  {isFlagged ? 'Marcada' : ''}
                </small>
              </span>
              <span>
                <details>
                  <summary>Revisar</summary>
                  <p className="metadata-block">{quote.notes || 'Sin notas del trabajador.'}</p>
                  <form action={updateQuoteAdminReview} className="quote-admin-form quote-admin-form-stacked">
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
                      Guardar
                    </button>
                  </form>
                  <form action={acceptQuoteWithAdminOverride} className="quote-admin-form quote-admin-form-stacked">
                    <input name="quoteId" type="hidden" value={quote.id} />
                    <input name="overrideReason" placeholder="Motivo obligatorio de la anulación administrativa" />
                    <button className="warning-button" type="submit">
                      Aceptar con anulación
                    </button>
                  </form>
                </details>
              </span>
            </div>
          );
        })}
        {!quoteRows.length ? <p className="empty-state">No hay cotizaciones enviadas para esta solicitud.</p> : null}
      </section>
    </main>
  );
}
