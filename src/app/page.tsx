import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <h1>Todero Marketplace</h1>
        <p>Sign in or create an account to continue.</p>
        <div className="form-stack">
          <Link className="primary-button" href="/login">
            Log in
          </Link>
          <Link className="primary-button" href="/signup">
            Sign up
          </Link>
        </div>
      </section>
    </main>
  );
}
