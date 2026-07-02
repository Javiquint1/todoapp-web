import Link from 'next/link';
import { requireAdmin } from '@/lib/supabase-server';
import { jobStatuses, statusLabel } from './constants';

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    worker?: string;
    customer?: string;
    city?: string;
  }>;
};

type Job = {
  id: string;
  service_request_id: string;
  quote_id: string | null;
  customer_profile_id: string;
  worker_profile_id: string;
  category_id: string;
  scheduled_at: string | null;
  status: string;
  total_amount: number | string | null;
  created_at: string;
};

type ServiceRequest = {
  id: string;
  city: string;
  address: string;
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

function personName(personId: string, peopleById: Map<string, PersonProfile>, profilesById: Map<string, Profile>, fallback: string) {
  const person = peopleById.get(personId);
  const profile = person ? profilesById.get(person.profile_id) : null;
  return profile?.full_name ?? fallback;
}

export const dynamic = 'force-dynamic';

export default async function AdminJobsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdmin();
  const selectedStatus = jobStatuses.includes(resolvedSearchParams?.status as (typeof jobStatuses)[number])
    ? resolvedSearchParams?.status
    : '';
  const selectedWorker = resolvedSearchParams?.worker?.trim() ?? '';
  const selectedCustomer = resolvedSearchParams?.customer?.trim() ?? '';
  const selectedCity = resolvedSearchParams?.city?.trim() ?? '';

  let query = supabase
    .from('jobs')
    .select('id,service_request_id,quote_id,customer_profile_id,worker_profile_id,category_id,scheduled_at,status,total_amount,created_at')
    .order('created_at', { ascending: false });

  if (selectedStatus) {
    query = query.eq('status', selectedStatus);
  }
  if (selectedWorker) {
    query = query.eq('worker_profile_id', selectedWorker);
  }
  if (selectedCustomer) {
    query = query.eq('customer_profile_id', selectedCustomer);
  }

  const { data: jobs, error: jobsError } = await query;

  if (jobsError) {
    throw new Error(jobsError.message);
  }

  const jobRows = (jobs ?? []) as Job[];
  const requestIds = [...new Set(jobRows.map((job) => job.service_request_id))];
  const workerIds = [...new Set(jobRows.map((job) => job.worker_profile_id))];
  const customerIds = [...new Set(jobRows.map((job) => job.customer_profile_id))];
  const categoryIds = [...new Set(jobRows.map((job) => job.category_id))];

  const [{ data: requests }, { data: workers }, { data: customers }, { data: categories }] = await Promise.all([
    requestIds.length ? supabase.from('service_requests').select('id,city,address').in('id', requestIds) : Promise.resolve({ data: [] }),
    workerIds.length ? supabase.from('worker_profiles').select('id,profile_id').in('id', workerIds) : Promise.resolve({ data: [] }),
    customerIds.length ? supabase.from('customer_profiles').select('id,profile_id').in('id', customerIds) : Promise.resolve({ data: [] }),
    categoryIds.length ? supabase.from('service_categories').select('id,name').in('id', categoryIds) : Promise.resolve({ data: [] }),
  ]);

  const requestRows = (requests ?? []) as ServiceRequest[];
  const workerRows = (workers ?? []) as PersonProfile[];
  const customerRows = (customers ?? []) as PersonProfile[];
  const profileIds = [...new Set([...workerRows, ...customerRows].map((person) => person.profile_id))];
  const { data: profiles } = profileIds.length
    ? await supabase.from('profiles').select('id,full_name,email').in('id', profileIds)
    : { data: [] };

  const requestsById = new Map(requestRows.map((request) => [request.id, request]));
  const workersById = new Map(workerRows.map((worker) => [worker.id, worker]));
  const customersById = new Map(customerRows.map((customer) => [customer.id, customer]));
  const profilesById = new Map(((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile]));
  const categoriesById = new Map(((categories ?? []) as Category[]).map((category) => [category.id, category]));
  const cities = [...new Set(requestRows.map((request) => request.city).filter(Boolean))];
  const filteredJobs = selectedCity
    ? jobRows.filter((job) => requestsById.get(job.service_request_id)?.city === selectedCity)
    : jobRows;

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Trabajos</p>
          <h1>Gestión de trabajos</h1>
          <p>Supervisa trabajos aceptados, revisa el avance operativo y aplica anulaciones administrativas con trazabilidad.</p>
        </div>
        <Link className="secondary-link" href="/admin">
          Volver al panel
        </Link>
      </section>

      <section className="admin-table">
        <form className="filter-panel">
          <label>
            Estado
            <select defaultValue={selectedStatus} name="status">
              <option value="">Todos</option>
              {jobStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trabajador
            <select defaultValue={selectedWorker} name="worker">
              <option value="">Todos</option>
              {workerRows.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {personName(worker.id, workersById, profilesById, 'Trabajador')}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cliente
            <select defaultValue={selectedCustomer} name="customer">
              <option value="">Todos</option>
              {customerRows.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {personName(customer.id, customersById, profilesById, 'Cliente')}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ciudad
            <select defaultValue={selectedCity} name="city">
              <option value="">Todas</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
          <div className="filter-links">
            <button className="small-action" type="submit">
              Aplicar filtros
            </button>
            <Link className="secondary-link" href="/admin/jobs">
              Limpiar
            </Link>
          </div>
        </form>

        <div className="admin-row admin-row-head job-row">
          <span>Trabajo</span>
          <span>Cliente</span>
          <span>Trabajador</span>
          <span>Ciudad</span>
          <span>Estado</span>
          <span>Acción</span>
        </div>
        {filteredJobs.map((job) => {
          const request = requestsById.get(job.service_request_id);
          return (
            <div className="admin-row job-row" key={job.id}>
              <span>
                <strong>{categoriesById.get(job.category_id)?.name ?? 'Servicio'}</strong>
                <small>{money(job.total_amount)}</small>
              </span>
              <span>{personName(job.customer_profile_id, customersById, profilesById, 'Cliente')}</span>
              <span>{personName(job.worker_profile_id, workersById, profilesById, 'Trabajador')}</span>
              <span>
                {request?.city ?? '-'}
                <small>{job.scheduled_at ? new Date(job.scheduled_at).toLocaleString('es-CO') : 'Sin programar'}</small>
              </span>
              <span className={`status-pill status-${job.status}`}>{statusLabel(job.status)}</span>
              <Link className="secondary-link" href={`/admin/jobs/${job.id}`}>
                Abrir
              </Link>
            </div>
          );
        })}
        {!filteredJobs.length ? <p className="empty-state">No hay trabajos que coincidan con estos filtros.</p> : null}
      </section>
    </main>
  );
}
