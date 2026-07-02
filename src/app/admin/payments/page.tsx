import Link from 'next/link';
import { createManualPayment } from './actions';
import { inactivePaymentProviders, paymentStatusLabel, paymentStatuses, payoutStatusLabel, payoutStatuses } from './constants';
import { requireAdmin } from '@/lib/supabase-server';

type PageProps = {
  searchParams?: Promise<{
    paymentStatus?: string;
    payoutStatus?: string;
    provider?: string;
  }>;
};

type Payment = {
  id: string;
  job_id: string;
  customer_profile_id: string;
  worker_profile_id: string;
  amount: number | string;
  platform_fee: number | string;
  worker_amount: number | string;
  payment_provider: string;
  provider_reference: string | null;
  payment_status: string;
  payout_status: string;
  created_at: string;
};

type Job = {
  id: string;
  category_id: string;
  service_request_id: string;
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
};

type ServiceRequest = {
  id: string;
  city: string;
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

function profileName(personId: string, peopleById: Map<string, PersonProfile>, profilesById: Map<string, Profile>, fallback: string) {
  const person = peopleById.get(personId);
  const profile = person ? profilesById.get(person.profile_id) : null;
  return profile?.full_name ?? fallback;
}

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdmin();
  const selectedPaymentStatus = paymentStatuses.includes(resolvedSearchParams?.paymentStatus as (typeof paymentStatuses)[number])
    ? resolvedSearchParams?.paymentStatus
    : '';
  const selectedPayoutStatus = payoutStatuses.includes(resolvedSearchParams?.payoutStatus as (typeof payoutStatuses)[number])
    ? resolvedSearchParams?.payoutStatus
    : '';
  const selectedProvider = resolvedSearchParams?.provider?.trim() ?? '';

  let query = supabase
    .from('payments')
    .select(
      'id,job_id,customer_profile_id,worker_profile_id,amount,platform_fee,worker_amount,payment_provider,provider_reference,payment_status,payout_status,created_at',
    )
    .order('created_at', { ascending: false });

  if (selectedPaymentStatus) {
    query = query.eq('payment_status', selectedPaymentStatus);
  }
  if (selectedPayoutStatus) {
    query = query.eq('payout_status', selectedPayoutStatus);
  }
  if (selectedProvider) {
    query = query.eq('payment_provider', selectedProvider);
  }

  const [{ data: payments, error: paymentsError }, { data: jobsForForm }] = await Promise.all([
    query,
    supabase.from('jobs').select('id,category_id,service_request_id,status').order('created_at', { ascending: false }).limit(50),
  ]);

  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  const paymentRows = (payments ?? []) as Payment[];
  const jobIds = [...new Set([...paymentRows.map((payment) => payment.job_id), ...((jobsForForm ?? []) as Job[]).map((job) => job.id)])];
  const customerIds = [...new Set(paymentRows.map((payment) => payment.customer_profile_id))];
  const workerIds = [...new Set(paymentRows.map((payment) => payment.worker_profile_id))];
  const [{ data: jobs }, { data: customers }, { data: workers }] = await Promise.all([
    jobIds.length ? supabase.from('jobs').select('id,category_id,service_request_id,status').in('id', jobIds) : Promise.resolve({ data: [] }),
    customerIds.length ? supabase.from('customer_profiles').select('id,profile_id').in('id', customerIds) : Promise.resolve({ data: [] }),
    workerIds.length ? supabase.from('worker_profiles').select('id,profile_id').in('id', workerIds) : Promise.resolve({ data: [] }),
  ]);

  const jobRows = (jobs ?? []) as Job[];
  const requestIds = [...new Set(jobRows.map((job) => job.service_request_id))];
  const categoryIds = [...new Set(jobRows.map((job) => job.category_id))];
  const profileIds = [...new Set([...(customers ?? []), ...(workers ?? [])].map((person) => (person as PersonProfile).profile_id))];
  const [{ data: requests }, { data: categories }, { data: profiles }] = await Promise.all([
    requestIds.length ? supabase.from('service_requests').select('id,city').in('id', requestIds) : Promise.resolve({ data: [] }),
    categoryIds.length ? supabase.from('service_categories').select('id,name').in('id', categoryIds) : Promise.resolve({ data: [] }),
    profileIds.length ? supabase.from('profiles').select('id,full_name,email').in('id', profileIds) : Promise.resolve({ data: [] }),
  ]);

  const jobsById = new Map(jobRows.map((job) => [job.id, job]));
  const requestsById = new Map(((requests ?? []) as ServiceRequest[]).map((request) => [request.id, request]));
  const categoriesById = new Map(((categories ?? []) as Category[]).map((category) => [category.id, category]));
  const customersById = new Map(((customers ?? []) as PersonProfile[]).map((customer) => [customer.id, customer]));
  const workersById = new Map(((workers ?? []) as PersonProfile[]).map((worker) => [worker.id, worker]));
  const profilesById = new Map(((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile]));
  const providers = [...new Set(paymentRows.map((payment) => payment.payment_provider).filter(Boolean))];

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Pagos</p>
          <h1>Pagos MVP</h1>
          <p>Registra pagos manuales, controla cobros de clientes y marca pagos al trabajador sin integraciones automáticas.</p>
        </div>
        <Link className="secondary-link" href="/admin">
          Volver al panel
        </Link>
      </section>

      <section className="admin-grid">
        <article className="admin-card admin-card-wide">
          <h2>Crear pago manual</h2>
          <form action={createManualPayment} className="payment-create-form">
            <label>
              Trabajo
              <select name="jobId" required>
                <option value="">Seleccionar trabajo</option>
                {((jobsForForm ?? []) as Job[]).map((job) => {
                  const category = categoriesById.get(job.category_id);
                  const request = requestsById.get(job.service_request_id);
                  return (
                    <option key={job.id} value={job.id}>
                      {category?.name ?? 'Trabajo'} · {request?.city ?? 'Sin ciudad'} · {job.status}
                    </option>
                  );
                })}
              </select>
            </label>
            <label>
              Valor total
              <input min="0" name="amount" placeholder="0" required step="100" type="number" />
            </label>
            <label>
              Tarifa plataforma
              <input defaultValue="0" min="0" name="platformFee" step="100" type="number" />
            </label>
            <label>
              Proveedor
              <select defaultValue="manual" name="paymentProvider">
                {inactivePaymentProviders.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Referencia
              <input name="providerReference" placeholder="Referencia manual" />
            </label>
            <label className="payment-notes-field">
              Notas internas
              <textarea className="admin-textarea" name="adminNotes" />
            </label>
            <button className="primary-button" type="submit">
              Crear pago
            </button>
          </form>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Registros de pago</h2>
          <form className="filter-panel payment-filter-panel">
            <label>
              Estado del pago
              <select defaultValue={selectedPaymentStatus} name="paymentStatus">
                <option value="">Todos</option>
                {paymentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {paymentStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Pago al trabajador
              <select defaultValue={selectedPayoutStatus} name="payoutStatus">
                <option value="">Todos</option>
                {payoutStatuses.map((status) => (
                  <option key={status} value={status}>
                    {payoutStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Proveedor
              <select defaultValue={selectedProvider} name="provider">
                <option value="">Todos</option>
                {[...new Set([...providers, ...inactivePaymentProviders])].map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </label>
            <div className="filter-links">
              <button className="small-action" type="submit">
                Aplicar filtros
              </button>
              <Link className="secondary-link" href="/admin/payments">
                Limpiar
              </Link>
            </div>
          </form>

          <div className="admin-table embedded-table">
            <div className="admin-row admin-row-head payment-row">
              <span>Pago</span>
              <span>Cliente</span>
              <span>Trabajador</span>
              <span>Valor</span>
              <span>Estados</span>
              <span>Acción</span>
            </div>
            {paymentRows.map((payment) => {
              const job = jobsById.get(payment.job_id);
              const request = job ? requestsById.get(job.service_request_id) : null;
              const category = job ? categoriesById.get(job.category_id) : null;
              return (
                <div className="admin-row payment-row" key={payment.id}>
                  <span>
                    <strong>{category?.name ?? 'Pago'}</strong>
                    <small>
                      {payment.payment_provider} · {request?.city ?? 'Sin ciudad'}
                    </small>
                  </span>
                  <span>{profileName(payment.customer_profile_id, customersById, profilesById, 'Cliente')}</span>
                  <span>{profileName(payment.worker_profile_id, workersById, profilesById, 'Trabajador')}</span>
                  <span>
                    {money(payment.amount)}
                    <small>Trabajador: {money(payment.worker_amount)}</small>
                  </span>
                  <span>
                    <span className={`status-pill status-${payment.payment_status}`}>{paymentStatusLabel(payment.payment_status)}</span>
                    <small>{payoutStatusLabel(payment.payout_status)}</small>
                  </span>
                  <Link className="secondary-link" href={`/admin/payments/${payment.id}`}>
                    Abrir
                  </Link>
                </div>
              );
            })}
            {!paymentRows.length ? <p className="empty-state">No hay pagos registrados.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
