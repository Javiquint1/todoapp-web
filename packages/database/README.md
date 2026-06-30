# @shared/database - Database Types & Helpers

Database type definitions and Supabase client helpers for Todero Marketplace.

## 📋 Overview

This package provides:

- **Generated Types**: Auto-generated types from Supabase schema
- **Client Utilities**: Pre-configured Supabase client instances
- **Query Helpers**: Common database query helpers
- **Type Safety**: Full TypeScript support for database operations

## 🛠 Tech Stack

- **Supabase** - PostgreSQL + Authentication + Real-time
- **Supabase JavaScript Client** 2.38+
- **TypeScript** 5.3+

## 📁 Structure

```
packages/database/src/
├── index.ts                  # Main exports
├── client.ts                 # Supabase client setup
├── types.ts                  # Auto-generated database types
├── queries/
│   ├── users.ts              # User queries
│   ├── workers.ts            # Worker queries
│   ├── customers.ts          # Customer queries
│   ├── bookings.ts           # Booking queries
│   ├── payments.ts           # Payment queries
│   ├── disputes.ts           # Dispute queries
│   └── admin.ts              # Admin queries
└── hooks/                    # Custom React hooks (for web/mobile)
    ├── useAuth.ts
    ├── useBookings.ts
    └── useWorker.ts
```

## 🚀 Usage

### Create Supabase Client

```typescript
import { createSupabaseClient } from '@shared/database';

// In server component (Next.js)
const supabase = createSupabaseClient();
const data = await supabase.from('users').select('*');

// In client component (Next.js)
import { useSupabaseClient } from '@supabase/auth-helpers-react';
const supabase = useSupabaseClient();
```

### Use Pre-built Queries

```typescript
import { getUserById, getWorkerProfile } from '@shared/database';

// Get user
const user = await getUserById('user-uuid');

// Get worker with services
const worker = await getWorkerProfile('worker-uuid');
```

### Type-Safe Queries

```typescript
import type { Database } from '@shared/database';

// Infer types from database schema
type User = Database['public']['Tables']['users']['Row'];
type InsertBooking = Database['public']['Tables']['bookings']['Insert'];

// Use in queries
const booking: InsertBooking = {
  customer_id: 'cust-uuid',
  worker_id: 'worker-uuid',
  service_id: 'service-uuid',
  // ... other fields
};

const result = await supabase
  .from('bookings')
  .insert([booking]);
```

### Real-time Subscriptions

```typescript
import { subscribeToBookingUpdates } from '@shared/database';

const unsubscribe = subscribeToBookingUpdates(bookingId, (booking) => {
  console.log('Booking updated:', booking);
});

// Cleanup
unsubscribe();
```

## 📚 Common Queries

### Users

```typescript
import {
  getUserById,
  getUserByEmail,
  createUser,
  updateUserProfile,
} from '@shared/database';

// Get user by ID
const user = await getUserById('user-123');

// Get user by email
const user = await getUserByEmail('customer@example.com');

// Create new user (usually via auth)
const user = await createUser({
  email: 'worker@example.com',
  full_name: 'Juan García',
  role: 'WORKER',
});

// Update profile
await updateUserProfile('user-123', {
  profile_photo_url: 'https://...',
  bio: 'Professional plumber',
});
```

### Bookings

```typescript
import {
  getCustomerBookings,
  getWorkerBookings,
  createBooking,
  updateBookingStatus,
  getBookingWithDetails,
} from '@shared/database';

// Get customer's bookings
const bookings = await getCustomerBookings('customer-uuid');

// Get worker's jobs
const jobs = await getWorkerBookings('worker-uuid');

// Create booking
const booking = await createBooking({
  customer_id: 'cust-uuid',
  worker_id: 'worker-uuid',
  scheduled_date: new Date(),
  status: 'CONFIRMED',
  // ...
});

// Update booking status
await updateBookingStatus('booking-uuid', 'COMPLETED');

// Get full booking details with customer and worker
const details = await getBookingWithDetails('booking-uuid');
```

### Workers

```typescript
import {
  getVerifiedWorkers,
  getWorkersByCategory,
  updateWorkerVerification,
  getWorkerStats,
} from '@shared/database';

// Get all verified workers
const workers = await getVerifiedWorkers();

// Get workers by service category
const plumbers = await getWorkersByCategory('PLUMBING');

// Update verification status
await updateWorkerVerification('worker-uuid', 'VERIFIED');

// Get worker statistics
const stats = await getWorkerStats('worker-uuid');
// Returns: { completed_jobs, rating, on_time_rate, ... }
```

### Payments

```typescript
import {
  createPayment,
  getPaymentByBooking,
  updatePaymentStatus,
  processRefund,
} from '@shared/database';

// Create payment
const payment = await createPayment({
  booking_id: 'booking-uuid',
  amount: 250000,
  payment_method: 'CREDIT_CARD',
  status: 'PENDING',
});

// Get payment
const payment = await getPaymentByBooking('booking-uuid');

// Update status (escrow workflow)
await updatePaymentStatus('payment-uuid', 'CAPTURED');

// Process refund
await processRefund('payment-uuid', 100000);
```

### Disputes

```typescript
import {
  createDispute,
  getDisputesByStatus,
  updateDisputeResolution,
  addDisputeEvidence,
} from '@shared/database';

// Create dispute
const dispute = await createDispute({
  booking_id: 'booking-uuid',
  filed_by_user_id: 'user-uuid',
  dispute_type: 'SERVICE_QUALITY',
  description: 'Service not completed as agreed',
});

// Get open disputes
const openDisputes = await getDisputesByStatus('OPEN');

// Resolve dispute
await updateDisputeResolution('dispute-uuid', {
  resolution_type: 'PARTIAL_REFUND',
  resolution_amount: 125000,
});

// Add evidence
await addDisputeEvidence('dispute-uuid', {
  evidence_type: 'PHOTO',
  file_path: 's3://bucket/photo.jpg',
});
```

## 🔌 React Hooks

### useAuth

```typescript
import { useAuth } from '@shared/database';

const MyComponent = () => {
  const { user, loading, isSignedIn } = useAuth();

  if (loading) return <Spinner />;
  if (!isSignedIn) return <Login />;

  return <Dashboard user={user} />;
};
```

### useBookings

```typescript
import { useBookings } from '@shared/database';

const BookingList = ({ customerId }: { customerId: string }) => {
  const { bookings, loading, error } = useBookings(customerId);

  return (
    <div>
      {bookings.map((b) => (
        <BookingCard key={b.id} booking={b} />
      ))}
    </div>
  );
};
```

### useWorker

```typescript
import { useWorker } from '@shared/database';

const WorkerProfile = ({ workerId }: { workerId: string }) => {
  const { worker, loading } = useWorker(workerId);

  if (loading) return <Spinner />;

  return <WorkerProfileCard worker={worker} />;
};
```

## 🔄 Real-time Updates

Subscribe to real-time database changes:

```typescript
import { Database } from '@shared/database';

supabase
  .channel('bookings')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'bookings',
      filter: `id=eq.${bookingId}`,
    },
    (payload) => {
      console.log('Booking updated:', payload.new);
    }
  )
  .subscribe();
```

## 📝 Auto-generating Types

When database schema changes in Supabase:

```bash
# Generate latest types
pnpm supabase gen types typescript --project-id <project-id> > src/types.ts
```

Or use Supabase CLI:

```bash
npx supabase gen types typescript --linked > src/types.ts
```

## ⚙️ Configuration

### Environment Variables

Create `.env.local` in root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Client Initialization

```typescript
// packages/database/src/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function createSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

## 🧪 Testing

Use Supabase's test client:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe('Database Queries', () => {
  it('should fetch user', async () => {
    const user = await getUserById('test-user-id');
    expect(user).toBeDefined();
  });
});
```

## 🏗 Building

```bash
# Build package
pnpm build

# Type check
pnpm type-check

# Run tests
pnpm test
```

## 📞 Contributing

1. Add query in appropriate `queries/*.ts` file
2. Export from `index.ts`
3. Add TypeScript type from auto-generated types
4. Document usage with JSDoc
5. Add tests

## 📚 Resources

- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/)
- [Database Operations](https://supabase.com/docs/guides/database)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
