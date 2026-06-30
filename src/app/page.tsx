import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <h1>Todero Marketplace</h1>
        <p>Inicia sesión o crea una cuenta para continuar.</p>
        <div className="form-stack">
          <Link className="primary-button" href="/login">
            Iniciar sesión
          </Link>
          <Link className="primary-button" href="/signup">
            Crear cuenta
          </Link>
        </div>
      </section>
    </main>
  );
}
