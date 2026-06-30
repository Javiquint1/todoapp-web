import Link from 'next/link';
import { requireAdmin } from '@/lib/supabase-server';

type ServiceRequestRow = {
  id: string;
  city: string;
  address: string;
  details: string | null;
  status: string;
  created_at: string;
  customer_profile_id: string;
  category_id: string;
};

type CategoryRow = {
  id: string;
  name: string;
};

type CustomerRow = {
  id: string;
  profile_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
};

export default async function AdminServiceRequestsPage() {
  const { supabase } = await requireAdmin();

  const { data: requests, error: requestsError } = await supabase
    .from('service_requests')
    .select('id,city,address,details,status,created_at,customer_profile_id,category_id')
    .in('status', ['requested', 'reviewing', 'assigned'])
    .order('created_at', { ascending: false });

  if (requestsError) {
    throw new Error(requestsError.message);
  }

  const typedRequests = (requests ?? []) as ServiceRequestRow[];
  const customerProfileIds = [...new Set(typedRequests.map((request) => request.customer_profile_id))];
  const categoryIds = [...new Set(typedRequests.map((request) => request.category_id))];

  const [{ data: customers }, { data: categories }] = await Promise.all([
    customerProfileIds.length
      ? supabase.from('customer_profiles').select('id,profile_id').in('id', customerProfileIds)
      : Promise.resolve({ data: [] }),
    categoryIds.length ? supabase.from('service_categories').select('id,name').in('id', categoryIds) : Promise.resolve({ data: [] }),
  ]);

  const profileIds = ((customers ?? []) as CustomerRow[]).map((customer) => customer.profile_id);
  const { data: profiles } = profileIds.length
    ? await supabase.from('profiles').select('id,full_name,email').in('id', profileIds)
    : { data: [] };

  const customerById = new Map(((customers ?? []) as CustomerRow[]).map((customer) => [customer.id, customer]));
  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  const categoryById = new Map(((categories ?? []) as CategoryRow[]).map((category) => [category.id, category]));

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Asignación</p>
          <h1>Solicitudes de servicio</h1>
          <p>Revisa solicitudes abiertas y asigna trabajadores aprobados.</p>
        </div>
        <Link className="secondary-link" href="/admin">
          Volver al panel
        </Link>
      </section>

      <section className="admin-table">
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
                {profile?.full_name ?? 'Cliente'}
                <small>{profile?.email ?? request.address}</small>
              </span>
              <span>{categoryById.get(request.category_id)?.name ?? 'Servicio'}</span>
              <span>{request.city}</span>
              <span className={`status-pill status-${request.status.toLowerCase()}`}>{request.status}</span>
              <Link className="secondary-link" href={`/admin/solicitudes/${request.id}`}>
                Asignar
              </Link>
            </div>
          );
        })}
        {!typedRequests.length ? <p className="empty-state">No hay solicitudes pendientes.</p> : null}
      </section>
    </main>
  );
}
