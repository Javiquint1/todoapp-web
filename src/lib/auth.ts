import type { UserRole } from '@shared/types';

export function routeForRole(role: UserRole) {
  if (role === 'ADMIN') {
    return '/admin';
  }

  if (role === 'WORKER') {
    return '/worker';
  }

  return '/customer';
}

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('invalid login') || message.includes('invalid credentials')) {
      return 'Correo o contraseña incorrectos.';
    }

    if (message.includes('email not confirmed')) {
      return 'Debes confirmar tu correo antes de iniciar sesión.';
    }

    if (message.includes('already registered') || message.includes('already exists')) {
      return 'Ya existe una cuenta con este correo.';
    }

    if (message.includes('password')) {
      return 'Revisa la contraseña. Debe cumplir los requisitos mínimos.';
    }

    return 'No pudimos completar la solicitud. Inténtalo de nuevo.';
  }

  return 'Algo salió mal. Inténtalo de nuevo.';
}
