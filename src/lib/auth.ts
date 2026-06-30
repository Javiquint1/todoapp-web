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
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}
