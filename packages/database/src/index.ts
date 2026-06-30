/**
 * @shared/database - Database Types and Helpers
 *
 * This package exports database types (auto-generated from Supabase),
 * Supabase client helpers, and common database queries.
 *
 * Usage:
 * import { createSupabaseClient } from '@shared/database';
 * import type { Database } from '@shared/database';
 *
 * const supabase = createSupabaseClient();
 * const data = await supabase.from('users').select('*');
 */

import { createClient } from '@supabase/supabase-js';

// Auto-generated database types from Supabase schema
// These types are generated from the actual database structure
// Run: `supabase gen types typescript > src/database.types.ts`
export type Database = any; // Placeholder - will be auto-generated

/**
 * Create a Supabase client instance
 * Uses environment variables for credentials
 */
export function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    throw new Error('Missing Supabase credentials in environment variables');
  }

  return createClient(url, key);
}

/**
 * Create a Supabase client with service role key (server-side only)
 * Use this for admin operations with unrestricted access
 */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !key) {
    throw new Error('Missing Supabase service role key in environment variables');
  }

  return createClient(url, key);
}

// Export commonly used types
export type { AuthError, AuthApiError } from '@supabase/supabase-js';

// Query helpers (to be implemented)
export const queries = {
  // Users
  getUserById: async (id: string) => {
    // To be implemented
    console.log('Fetching user:', id);
  },

  // Bookings
  getBookingsByCustomer: async (customerId: string) => {
    // To be implemented
    console.log('Fetching bookings for customer:', customerId);
  },

  // Workers
  getVerifiedWorkers: async () => {
    // To be implemented
    console.log('Fetching verified workers');
  },

  // Payments
  getPaymentByBooking: async (bookingId: string) => {
    // To be implemented
    console.log('Fetching payment for booking:', bookingId);
  },
};

export default {
  createSupabaseClient,
  createSupabaseAdmin,
  queries,
};
