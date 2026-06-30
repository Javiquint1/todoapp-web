import Link from 'next/link';

export default function AdminPage() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <h1>Panel administrativo</h1>
        <p>Gestiona verificaciones, seguridad y operaciones de la plataforma.</p>
        <div className="form-stack">
          <Link className="primary-button" href="/admin/solicitudes">
            Asignar solicitudes de servicio
          </Link>
          <Link className="primary-button" href="/admin/service-requests">
            Gestionar solicitudes de servicio
          </Link>
          <Link className="primary-button" href="/admin/quotes">
            Monitorear cotizaciones
          </Link>
          <Link className="primary-button" href="/admin/workers">
            Ver verificaciones de trabajadores
          </Link>
        </div>
      </section>
    </main>
  );
}
