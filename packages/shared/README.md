# @shared/types - Type Definitions

Shared TypeScript type definitions used across all Todero Marketplace applications.

## 📋 Overview

This package contains all domain types that are shared between web, mobile, and backend services. Centralizing types ensures consistency and single source of truth across the platform.

## 📁 Structure

```
packages/shared/src/
├── index.ts              # Main exports
├── user.ts               # User-related types
├── worker.ts             # Worker-specific types
├── customer.ts           # Customer-specific types
├── admin.ts              # Admin-specific types
├── booking.ts            # Booking-related types
├── payment.ts            # Payment types
├── dispute.ts            # Dispute types
├── safety.ts             # Safety report types
├── verification.ts       # Worker verification types
└── common.ts             # Common/shared types
```

## 🚀 Usage

### In Web App

```typescript
import type { User, Booking, Worker } from '@shared/types';

const handleBooking = (booking: Booking) => {
  console.log(`Booking ${booking.id} for ${booking.customer.name}`);
};
```

### In Mobile App

```typescript
import type { Worker, Service } from '@shared/types';

const displayWorkerProfile = (worker: Worker) => {
  return <WorkerCard worker={worker} />;
};
```

### In API Routes

```typescript
import type { CreateBookingRequest } from '@shared/types';

export async function POST(req: Request) {
  const body: CreateBookingRequest = await req.json();
  // Process booking
}
```

## 📚 Type Categories

### User Management

- `User` - Base user type (customer, worker, or admin)
- `Customer` - Customer-specific properties
- `Worker` - Worker-specific properties
- `WorkerVerification` - Verification status and documents
- `Admin` - Admin-specific properties

### Services & Bookings

- `ServiceCategory` - Service type definitions
- `WorkerService` - Service offered by a worker
- `Booking` - Booking record
- `BookingStatus` - Booking state enum

### Payments

- `Payment` - Payment transaction
- `Payout` - Worker payout
- `PaymentMethod` - Payment type enum

### Disputes & Safety

- `Dispute` - Dispute record
- `SafetyReport` - Safety incident report
- `DisputeStatus` - Dispute state enum

## 🔄 Type Inheritance

```
User (base)
├── Customer (extends User)
├── Worker (extends User)
│   └── WorkerVerification
└── Admin (extends User)

Booking
├── BookingService
├── BookingPayment
└── BookingReview
```

## 📝 Export Convention

All types should be exported from `index.ts`:

```typescript
// packages/shared/src/index.ts
export type { User, UserRole } from './user';
export type { Customer, CustomerPreferences } from './customer';
export type { Worker, WorkerVerification } from './worker';
export type { Booking, BookingStatus } from './booking';
// ... etc
```

## 🛠 Development

### Adding New Types

1. Create new file: `src/domain-name.ts`
2. Define types in the file
3. Export from `src/index.ts`
4. Document the type purpose
5. Use in apps once defined

### Building

```bash
pnpm build
```

Generates `dist/` with compiled JavaScript and type definitions (`.d.ts`).

## ⚠️ Type Safety

- Avoid `any` type - use `unknown` if type is truly dynamic
- Use discriminated unions for complex types
- Export types, not implementations
- Keep types immutable (use `readonly`)
- Document complex types with JSDoc comments

## 🔗 Dependencies

- **None** - This package has zero runtime dependencies for maximum portability

## 📞 Contributing

When adding new types:

1. Place in appropriate domain file
2. Export from `index.ts`
3. Document with JSDoc if complex
4. Update this README with new categories if adding major types
5. Ensure all apps update their usage

## 📚 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Advanced Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
