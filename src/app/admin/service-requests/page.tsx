import Link from 'next/link';
import { requireAdmin } from '@/lib/supabase-server';

type ServiceRequestSearchParams = {
  status?: string;
  city?: string;
  category?: string;
  urgency?: string;
};

type PageProps = {
  searchParams?: Promise<ServiceRequestSearchParams>;
};

type ServiceRequest = {
  id: string;
  city: string;
  address: string;
  details: string | null;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  customer_profile_id: string;
  category_id: string;
  metadata: Record<string, unknown> | null;
};

type Category = {
  id: string;
  name: string;
};

type CustomerProfile = {
  id: string;
  profile_id: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
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

const urgencyFilters = ['low', 'normal', 'high', 'urgent'];

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

function statusLabel(status: string) {
  return requestStatusLabels[status] ?? status;
}

function getUrgency(metadata: Record<string, unknown> | null) {
  return typeof metadata?.urgency === 'string' && metadata.urgency ? metadata.urgency : 'normal';
}

function filterHref(key: keyof ServiceRequestSearchParams, value: string, searchParams?: ServiceRequestSearchParams) {
  const params = new URLSearchParams();
  for (const [paramKey, paramValue] of Object.entries(searchParams ?? {})) {
    if (paramValue && paramKey !== key) {
      params.set(paramKey, paramValue);
    }
  }
  if (value) {
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `/admin/service-requests?${query}` : '/admin/service-requests';
}

export const dynamic = 'force-dynamic';

export default async function AdminServiceRequestsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdmin();
  const selectedStatus = requestStatuses.includes(resolvedSearchParams?.status ?? '') ? resolvedSearchParams?.status : '';
  const selectedCity = resolvedSearchParams?.city?.trim() ?? '';
  const selectedCategory = resolvedSearchParams?.category?.trim() ?? '';
  const selectedUrgency = urgencyFilters.includes(resolvedSearchParams?.urgency ?? '') ? resolvedSearchParams?.urgency : '';

  let query = supabase
    .from('service_requests')
    .select('id,city,address,details,status,scheduled_at,created_at,customer_profile_id,category_id,metadata')
    .order('created_at', { ascending: false });

  if (selectedStatus) {
    query = query.eq('status', selectedStatus);
  }
  if (selectedCity) {
    query = query.eq('city', selectedCity);
  }
  if (selectedCategory) {
    query = query.eq('category_id', selectedCategory);
  }
  if (selectedUrgency) {
    query = query.eq('metadata->>urgency', selectedUrgency);
  }

  const [{ data: requests, error: requestsError }, { data: allRequests }, { data: categories, error: categoriesError }] =
    await Promise.all([
      query,
      supabase.from('service_requests').select('city').order('city', { ascending: true }),
      supabase.from('service_categories').select('id,name').order('name', { ascending: true }),
    ]);

  if (requestsError || categoriesError) {
    throw new Error(requestsError?.message || categoriesError?.message);
  }

  const typedRequests = (requests ?? []) as ServiceRequest[];
  const customerProfileIds = [...new Set(typedRequests.map((request) => request.customer_profile_id))];
  const categoryIds = [...new Set(typedRequests.map((request) => request.category_id))];
  const [{ data: customers }, { data: requestCategories }] = await Promise.all([
    customerProfileIds.length
      ? supabase.from('customer_profiles').select('id,profile_id').in('id', customerProfileIds)
      : Promise.resolve({ data: [] }),
    categoryIds.length ? supabase.from('service_categories').select('id,name').in('id', categoryIds) : Promise.resolve({ data: [] }),
  ]);

  const profileIds = ((customers ?? []) as CustomerProfile[]).map((customer) => customer.profile_id);
  const { data: profiles } = profileIds.length
    ? await supabase.from('profiles').select('id,full_name,email').in('id', profileIds)
    : { data: [] };

  const customerById = new Map(((customers ?? []) as CustomerProfile[]).map((customer) => [customer.id, customer]));
  const profileById = new Map(((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile]));
  const categoryById = new Map(((requestCategories ?? []) as Category[]).map((category) => [category.id, category]));
  const cities = [...new Set(((allRequests ?? []) as { city: string }[]).map((request) => request.city).filter(Boolean))];

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Solicitudes</p>
          <h1>Gestión de solicitudes de servicio</h1>
          <p>Revisa solicitudes de clientes, asigna trabajadores aprobados y acompaña las cotizaciones hasta el cierre.</p>
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
              {requestStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
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
          <label>
            Categoría
            <select defaultValue={selectedCategory} name="category">
              <option value="">Todas</option>
              {((categories ?? []) as Category[]).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Urgencia
            <select defaultValue={selectedUrgency} name="urgency">
              <option value="">Todas</option>
              {urgencyFilters.map((urgency) => (
                <option key={urgency} value={urgency}>
                  {urgency}
                </option>
              ))}
            </select>
          </label>
          <div className="filter-links">
            <button className="small-action" type="submit">
              Aplicar filtros
            </button>
            <Link className="secondary-link" href="/admin/service-requests">
              Limpiar
            </Link>
          </div>
        </form>

        <nav className="filter-bar" aria-label="Filtros por estado">
          <Link
            className={!selectedStatus ? 'filter-chip filter-chip-active' : 'filter-chip'}
            href={filterHref('status', '', resolvedSearchParams)}
          >
            Todas
          </Link>
          {requestStatuses.map((status) => (
            <Link
              className={selectedStatus === status ? 'filter-chip filter-chip-active' : 'filter-chip'}
              href={filterHref('status', status, resolvedSearchParams)}
              key={status}
            >
              {statusLabel(status)}
            </Link>
          ))}
        </nav>

        <div className="admin-row admin-row-head">
          <span>Cliente</span>
          <span>Categoría</span>
          <span>Ciudad</span>
          <span>Estado</span>
          <span>Acción</span>
        </div>
        {typedRequests.map((request) => {
          const customer = customerById.get(request.customer_profile_id);
          const profile = customer ? profileById.get(customer.profile_id) : null;
          return (
            <div className="admin-row" key={request.id}>
              <span>
                <strong>{profile?.full_name ?? 'Cliente'}</strong>
                <small>{profile?.email ?? request.address}</small>
              </span>
              <span>{categoryById.get(request.category_id)?.name ?? 'Servicio'}</span>
              <span>
                {request.city}
                <small>{getUrgency(request.metadata)}</small>
              </span>
              <span className={`status-pill status-${request.status}`}>{statusLabel(request.status)}</span>
              <Link className="secondary-link" href={`/admin/service-requests/${request.id}`}>
                Abrir
              </Link>
            </div>
          );
        })}
        {!typedRequests.length ? <p className="empty-state">No hay solicitudes que coincidan con estos filtros.</p> : null}
      </section>
    </main>
  );
}
