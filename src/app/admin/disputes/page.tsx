import Link from 'next/link';
import { disputeStatusLabel, disputeStatuses, disputeTypeLabel, disputeTypes } from './constants';
import { requireAdmin } from '@/lib/supabase-server';

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    type?: string;
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
  created_at: string;
};

type Job = {
  id: string;
  service_request_id: string;
  customer_profile_id: string;
  worker_profile_id: string;
  category_id: string;
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

function profileName(profileId: string, profilesById: Map<string, Profile>) {
  return profilesById.get(profileId)?.full_name ?? 'Usuario';
}

function personName(personId: string, peopleById: Map<string, PersonProfile>, profilesById: Map<string, Profile>, fallback: string) {
  const person = peopleById.get(personId);
  return person ? profileName(person.profile_id, profilesById) : fallback;
}

export const dynamic = 'force-dynamic';

export default async function AdminDisputesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdmin();
  const selectedStatus = disputeStatuses.includes(resolvedSearchParams?.status as (typeof disputeStatuses)[number])
    ? resolvedSearchParams?.status
    : '';
  const selectedType = disputeTypes.includes(resolvedSearchParams?.type as (typeof disputeTypes)[number])
    ? resolvedSearchParams?.type
    : '';

  let query = supabase
    .from('disputes')
    .select('id,job_id,filed_by_profile_id,filed_against_profile_id,type,reason,status,created_at')
    .order('created_at', { ascending: false });

  if (selectedStatus) {
    query = query.eq('status', selectedStatus);
  }
  if (selectedType) {
    query = query.eq('type', selectedType);
  }

  const { data: disputes, error: disputesError } = await query;

  if (disputesError) {
    throw new Error(disputesError.message);
  }

  const disputeRows = (disputes ?? []) as Dispute[];
  const jobIds = [...new Set(disputeRows.map((dispute) => dispute.job_id))];
  const { data: jobs } = jobIds.length
    ? await supabase.from('jobs').select('id,service_request_id,customer_profile_id,worker_profile_id,category_id,status').in('id', jobIds)
    : { data: [] };

  const jobRows = (jobs ?? []) as Job[];
  const customerIds = [...new Set(jobRows.map((job) => job.customer_profile_id))];
  const workerIds = [...new Set(jobRows.map((job) => job.worker_profile_id))];
  const requestIds = [...new Set(jobRows.map((job) => job.service_request_id))];
  const categoryIds = [...new Set(jobRows.map((job) => job.category_id))];
  const [{ data: customers }, { data: workers }, { data: requests }, { data: categories }] = await Promise.all([
    customerIds.length ? supabase.from('customer_profiles').select('id,profile_id').in('id', customerIds) : Promise.resolve({ data: [] }),
    workerIds.length ? supabase.from('worker_profiles').select('id,profile_id').in('id', workerIds) : Promise.resolve({ data: [] }),
    requestIds.length ? supabase.from('service_requests').select('id,city').in('id', requestIds) : Promise.resolve({ data: [] }),
    categoryIds.length ? supabase.from('service_categories').select('id,name').in('id', categoryIds) : Promise.resolve({ data: [] }),
  ]);

  const customerRows = (customers ?? []) as PersonProfile[];
  const workerRows = (workers ?? []) as PersonProfile[];
  const profileIds = [
    ...disputeRows.flatMap((dispute) => [dispute.filed_by_profile_id, dispute.filed_against_profile_id]),
    ...customerRows.map((customer) => customer.profile_id),
    ...workerRows.map((worker) => worker.profile_id),
  ];
  const { data: profiles } = profileIds.length
    ? await supabase.from('profiles').select('id,full_name,email').in('id', [...new Set(profileIds)])
    : { data: [] };

  const jobsById = new Map(jobRows.map((job) => [job.id, job]));
  const customersById = new Map(customerRows.map((customer) => [customer.id, customer]));
  const workersById = new Map(workerRows.map((worker) => [worker.id, worker]));
  const requestsById = new Map(((requests ?? []) as ServiceRequest[]).map((request) => [request.id, request]));
  const categoriesById = new Map(((categories ?? []) as Category[]).map((category) => [category.id, category]));
  const profilesById = new Map(((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile]));

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Disputas</p>
          <h1>Gestión de disputas</h1>
          <p>Revisa reportes, solicita información y registra resoluciones con seguimiento administrativo.</p>
        </div>
        <Link className="secondary-link" href="/admin">
          Volver al panel
        </Link>
      </section>

      <section className="admin-table">
        <form className="filter-panel dispute-filter-panel">
          <label>
            Estado
            <select defaultValue={selectedStatus} name="status">
              <option value="">Todos</option>
              {disputeStatuses.map((status) => (
                <option key={status} value={status}>
                  {disputeStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo
            <select defaultValue={selectedType} name="type">
              <option value="">Todos</option>
              {disputeTypes.map((type) => (
                <option key={type} value={type}>
                  {disputeTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <div className="filter-links">
            <button className="small-action" type="submit">
              Aplicar filtros
            </button>
            <Link className="secondary-link" href="/admin/disputes">
              Limpiar
            </Link>
          </div>
        </form>

        <div className="admin-row admin-row-head dispute-row">
          <span>Disputa</span>
          <span>Cliente</span>
          <span>Trabajador</span>
          <span>Ciudad</span>
          <span>Estado</span>
          <span>Acción</span>
        </div>
        {disputeRows.map((dispute) => {
          const job = jobsById.get(dispute.job_id);
          const request = job ? requestsById.get(job.service_request_id) : null;
          const category = job ? categoriesById.get(job.category_id) : null;
          return (
            <div className="admin-row dispute-row" key={dispute.id}>
              <span>
                <strong>{disputeTypeLabel(dispute.type)}</strong>
                <small>{category?.name ?? 'Trabajo relacionado'}</small>
              </span>
              <span>{job ? personName(job.customer_profile_id, customersById, profilesById, 'Cliente') : profileName(dispute.filed_by_profile_id, profilesById)}</span>
              <span>{job ? personName(job.worker_profile_id, workersById, profilesById, 'Trabajador') : profileName(dispute.filed_against_profile_id, profilesById)}</span>
              <span>
                {request?.city ?? '-'}
                <small>{new Date(dispute.created_at).toLocaleDateString('es-CO')}</small>
              </span>
              <span className={`status-pill status-${dispute.status}`}>{disputeStatusLabel(dispute.status)}</span>
              <Link className="secondary-link" href={`/admin/disputes/${dispute.id}`}>
                Abrir
              </Link>
            </div>
          );
        })}
        {!disputeRows.length ? <p className="empty-state">No hay disputas que coincidan con estos filtros.</p> : null}
      </section>
    </main>
  );
}
