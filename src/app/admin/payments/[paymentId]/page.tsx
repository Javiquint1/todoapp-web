import Link from 'next/link';
import { notFound } from 'next/navigation';
import { savePaymentNotes, updatePaymentStatus, updatePayoutStatus } from '../actions';
import { paymentStatusLabel, paymentStatuses, payoutStatusLabel, payoutStatuses } from '../constants';
import { requireAdmin } from '@/lib/supabase-server';

type PageProps = {
  params: Promise<{
    paymentId: string;
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
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
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

type Job = {
  id: string;
  service_request_id: string;
  category_id: string;
  status: string;
  total_amount: number | string | null;
};

type ServiceRequest = {
  id: string;
  city: string;
  address: string;
};

type Category = {
  id: string;
  name: string;
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

function quickPaymentActionLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'Marcar cobro pendiente',
    paid: 'Marcar cobro pagado',
    failed: 'Marcar pago fallido',
    refunded: 'Marcar reembolso completado',
    partially_refunded: 'Marcar reembolso pendiente',
    cancelled: 'Cancelar pago',
  };
  return labels[status] ?? paymentStatusLabel(status);
}

function quickPayoutActionLabel(status: string) {
  const labels: Record<string, string> = {
    not_ready: 'Marcar pago no listo',
    pending: 'Marcar pago al trabajador pendiente',
    paid: 'Marcar pago al trabajador completado',
    failed: 'Marcar pago al trabajador fallido',
    held: 'Retener pago al trabajador',
  };
  return labels[status] ?? payoutStatusLabel(status);
}

export const dynamic = 'force-dynamic';

export default async function AdminPaymentDetailPage({ params }: PageProps) {
  const { paymentId } = await params;
  const { supabase } = await requireAdmin();
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select(
      'id,job_id,customer_profile_id,worker_profile_id,amount,platform_fee,worker_amount,payment_provider,provider_reference,payment_status,payout_status,admin_notes,created_at,updated_at',
    )
    .eq('id', paymentId)
    .single();

  if (paymentError || !payment) {
    notFound();
  }

  const typedPayment = payment as Payment;
  const [{ data: job }, { data: customer }, { data: worker }, { data: auditLogs }] = await Promise.all([
    supabase.from('jobs').select('id,service_request_id,category_id,status,total_amount').eq('id', typedPayment.job_id).single(),
    supabase.from('customer_profiles').select('id,profile_id').eq('id', typedPayment.customer_profile_id).single(),
    supabase.from('worker_profiles').select('id,profile_id').eq('id', typedPayment.worker_profile_id).single(),
    supabase.from('audit_logs').select('id,action,actor_profile_id,metadata,created_at').eq('entity', 'payments').eq('entity_id', typedPayment.id).order('created_at'),
  ]);

  const typedJob = job as Job | null;
  const [{ data: request }, { data: category }] = await Promise.all([
    typedJob
      ? supabase.from('service_requests').select('id,city,address').eq('id', typedJob.service_request_id).single()
      : Promise.resolve({ data: null }),
    typedJob ? supabase.from('service_categories').select('id,name').eq('id', typedJob.category_id).single() : Promise.resolve({ data: null }),
  ]);

  const auditRows = (auditLogs ?? []) as AuditLog[];
  const profileIds = [
    (customer as PersonProfile | null)?.profile_id,
    (worker as PersonProfile | null)?.profile_id,
    ...auditRows.map((log) => log.actor_profile_id),
  ].filter((id): id is string => Boolean(id));
  const { data: profiles } = profileIds.length
    ? await supabase.from('profiles').select('id,full_name,email,phone_number').in('id', [...new Set(profileIds)])
    : { data: [] };
  const profilesById = new Map(((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile]));
  const customerProfileId = (customer as PersonProfile | null)?.profile_id ?? null;
  const workerProfileId = (worker as PersonProfile | null)?.profile_id ?? null;
  const customerProfile = customerProfileId ? profilesById.get(customerProfileId) : null;
  const workerProfile = workerProfileId ? profilesById.get(workerProfileId) : null;

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Pago</p>
          <h1>{(category as Category | null)?.name ?? 'Registro de pago'}</h1>
          <p>
            {paymentStatusLabel(typedPayment.payment_status)} · {payoutStatusLabel(typedPayment.payout_status)}
          </p>
        </div>
        <Link className="secondary-link" href="/admin/payments">
          Volver a pagos
        </Link>
      </section>

      <section className="admin-grid">
        <article className="admin-card">
          <h2>Resumen</h2>
          <dl className="detail-list">
            <div>
              <dt>Valor total</dt>
              <dd>{money(typedPayment.amount)}</dd>
            </div>
            <div>
              <dt>Tarifa plataforma</dt>
              <dd>{money(typedPayment.platform_fee)}</dd>
            </div>
            <div>
              <dt>Valor trabajador</dt>
              <dd>{money(typedPayment.worker_amount)}</dd>
            </div>
            <div>
              <dt>Proveedor</dt>
              <dd>{typedPayment.payment_provider}</dd>
            </div>
            <div>
              <dt>Referencia</dt>
              <dd>{typedPayment.provider_reference ?? '-'}</dd>
            </div>
          </dl>
        </article>

        <article className="admin-card">
          <h2>Trabajo</h2>
          <dl className="detail-list">
            <div>
              <dt>Estado</dt>
              <dd>{typedJob?.status ?? '-'}</dd>
            </div>
            <div>
              <dt>Ciudad</dt>
              <dd>{(request as ServiceRequest | null)?.city ?? '-'}</dd>
            </div>
            <div>
              <dt>Dirección</dt>
              <dd>{(request as ServiceRequest | null)?.address ?? '-'}</dd>
            </div>
          </dl>
          <Link className="secondary-link" href={`/admin/jobs/${typedPayment.job_id}`}>
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
          <h2>Estado del cobro al cliente</h2>
          <div className="quick-action-grid">
            {paymentStatuses.map((status) => (
              <form action={updatePaymentStatus} key={status}>
                <input name="paymentId" type="hidden" value={typedPayment.id} />
                <input name="paymentStatus" type="hidden" value={status} />
                <button className={status === 'failed' || status === 'cancelled' ? 'danger-button' : 'small-action'} type="submit">
                  {quickPaymentActionLabel(status)}
                </button>
              </form>
            ))}
          </div>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Pago al trabajador</h2>
          <div className="quick-action-grid">
            {payoutStatuses.map((status) => (
              <form action={updatePayoutStatus} key={status}>
                <input name="paymentId" type="hidden" value={typedPayment.id} />
                <input name="payoutStatus" type="hidden" value={status} />
                <button className={status === 'failed' || status === 'held' ? 'warning-button' : 'small-action'} type="submit">
                  {quickPayoutActionLabel(status)}
                </button>
              </form>
            ))}
          </div>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Notas internas</h2>
          <form action={savePaymentNotes} className="form-stack">
            <input name="paymentId" type="hidden" value={typedPayment.id} />
            <textarea className="admin-textarea" defaultValue={typedPayment.admin_notes ?? ''} name="adminNotes" />
            <button className="primary-button" type="submit">
              Guardar notas
            </button>
          </form>
        </article>

        <article className="admin-card admin-card-wide">
          <h2>Auditoría</h2>
          <div className="timeline-list">
            {auditRows.map((log) => (
              <div className="timeline-item" key={log.id}>
                <strong>{log.action}</strong>
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
