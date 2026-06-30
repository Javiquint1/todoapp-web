'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import type { UserRole } from '@shared/types';
import { getAuthErrorMessage, routeForRole } from '@/lib/auth';
import { persistAuthSession } from '@/lib/session';
import { assertSupabaseBrowserConfig, supabase } from '@/lib/supabase';

type SignupRole = Extract<UserRole, 'CUSTOMER' | 'WORKER'>;

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<SignupRole>('CUSTOMER');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      assertSupabaseBrowserConfig();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('No se pudo crear el usuario.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: data.user.id,
          role,
          full_name: fullName,
          email,
          phone_number: phoneNumber || null,
          city: city || null,
        })
        .select('id')
        .single();

      if (profileError) {
        throw profileError;
      }

      const roleProfileTable = role === 'CUSTOMER' ? 'customer_profiles' : 'worker_profiles';
      const { error: roleProfileError } = await supabase.from(roleProfileTable).insert({
        user_id: data.user.id,
        profile_id: profile.id,
      });

      if (roleProfileError) {
        throw roleProfileError;
      }

      if (!data.session) {
        setSuccessMessage('Cuenta creada. Confirma tu correo antes de iniciar sesión.');
        return;
      }

      await persistAuthSession(data.session);
      router.replace(routeForRole(role));
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <h1>Crear cuenta</h1>
        <p>Elige un rol de cliente o trabajador para empezar en Todero.</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Nombre completo
            <input
              autoComplete="name"
              onChange={(event) => setFullName(event.target.value)}
              required
              value={fullName}
            />
          </label>
          <label>
            Correo electrónico
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Contraseña
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <label>
            Número de celular
            <input autoComplete="tel" onChange={(event) => setPhoneNumber(event.target.value)} value={phoneNumber} />
          </label>
          <label>
            Ciudad
            <input onChange={(event) => setCity(event.target.value)} value={city} />
          </label>
          <label>
            Rol
            <select onChange={(event) => setRole(event.target.value as SignupRole)} value={role}>
              <option value="CUSTOMER">Cliente</option>
              <option value="WORKER">Trabajador</option>
            </select>
          </label>
          {errorMessage ? <div className="error-text">{errorMessage}</div> : null}
          {successMessage ? <div className="success-text">{successMessage}</div> : null}
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        <Link className="muted-link" href="/login">
          ¿Ya tienes una cuenta?
        </Link>
      </section>
    </main>
  );
}
