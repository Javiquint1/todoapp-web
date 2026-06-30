# @shared/validation - Zod Schemas

Validation schemas for all API requests, form inputs, and data transformations using **Zod**.

## 📋 Overview

This package centralizes validation logic using Zod, providing:

- **Type Safety**: TypeScript inference from schemas
- **Runtime Validation**: Automatic runtime checks
- **Consistency**: Single source of truth for validation rules
- **Reusability**: Share schemas across web, mobile, and API

## 🛠 Tech Stack

- **Zod** 3.22+ - TypeScript-first schema validation library
- **TypeScript** 5.3+ - Static type checking

## 📁 Structure

```
packages/validation/src/
├── index.ts                  # Main exports
├── auth.ts                   # Authentication schemas
├── user.ts                   # User registration/update schemas
├── worker.ts                 # Worker profile schemas
├── customer.ts               # Customer profile schemas
├── booking.ts                # Booking request schemas
├── payment.ts                # Payment schemas
├── dispute.ts                # Dispute filing schemas
├── verification.ts           # Worker verification schemas
├── common.ts                 # Reusable base schemas
└── refinements.ts            # Custom Zod refinements
```

## 🚀 Usage

### In Web App (Form Validation)

```typescript
import { bookingRequestSchema } from '@shared/validation';

const createBooking = async (formData: unknown) => {
  // Parse and validate
  const validated = bookingRequestSchema.parse(formData);
  
  // Type is inferred as BookingRequest
  // Safe to use with API
  const response = await fetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(validated),
  });
};
```

### In API Routes (Request Validation)

```typescript
import { bookingRequestSchema } from '@shared/validation';

export async function POST(req: Request) {
  const body = await req.json();
  
  try {
    const validatedData = bookingRequestSchema.parse(body);
    // Process validated booking
  } catch (error) {
    return Response.json({ error: 'Invalid booking data' }, { status: 400 });
  }
}
```

### Extract TypeScript Types

```typescript
import { bookingRequestSchema } from '@shared/validation';
import { z } from 'zod';

// Infer TypeScript type from Zod schema
type BookingRequest = z.infer<typeof bookingRequestSchema>;

// Now use in function signatures
const processBooking = (data: BookingRequest) => {
  // data is type-safe
};
```

### Safe Parsing (Non-Throwing)

```typescript
import { userRegistrationSchema } from '@shared/validation';

const result = userRegistrationSchema.safeParse(userData);

if (result.success) {
  // result.data is valid
  const user = result.data;
} else {
  // result.error contains validation errors
  console.error(result.error.errors);
}
```

## 📚 Schema Categories

### Authentication

- `signUpSchema` - New user registration
- `loginSchema` - User login credentials
- `resetPasswordSchema` - Password reset request

### User Profiles

- `customerProfileSchema` - Customer profile creation/update
- `workerProfileSchema` - Worker profile creation/update
- `userPreferencesSchema` - User notification preferences

### Worker Verification

- `workerVerificationDocSchema` - Document upload validation
- `backgroundCheckSchema` - Background check data
- `referenceSchema` - Professional reference data

### Bookings

- `bookingRequestSchema` - New booking request
- `quoteRequestSchema` - Quote request from customer
- `bookingUpdateSchema` - Booking status updates

### Payments

- `paymentMethodSchema` - Payment method registration
- `paymentSchema` - Payment transaction
- `refundSchema` - Refund request

### Disputes

- `disputeFileSchema` - File new dispute
- `disputeEvidenceSchema` - Add evidence to dispute
- `disputeResolutionSchema` - Resolve dispute (admin)

## 🛠 Creating New Schemas

### Basic Schema

```typescript
// packages/validation/src/booking.ts
import { z } from 'zod';

export const bookingRequestSchema = z.object({
  service_id: z.string().uuid(),
  scheduled_date: z.string().datetime(),
  location: z.string().min(5),
  description: z.string().max(500),
});
```

### Schema with Refinements

```typescript
export const passwordSchema = z
  .string()
  .min(8)
  .refine(
    (val) => /[A-Z]/.test(val),
    'Password must contain uppercase letter'
  )
  .refine(
    (val) => /[0-9]/.test(val),
    'Password must contain number'
  );
```

### Reusing Schemas

```typescript
import { passwordSchema } from './common';

export const userRegistrationSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  password_confirm: z.string(),
}).refine((data) => data.password === data.password_confirm, {
  message: 'Passwords do not match',
  path: ['password_confirm'],
});
```

## 📝 Schema Naming Convention

- `*Schema` - Zod schema object
- `*Request` - Inferred type from request schema
- `*Response` - Inferred type from response schema
- `*Form` - Inferred type from form schema

```typescript
export const bookingRequestSchema = z.object({...});
export type BookingRequest = z.infer<typeof bookingRequestSchema>;
```

## 🔄 Export Convention

All schemas exported from `index.ts`:

```typescript
// packages/validation/src/index.ts
export {
  bookingRequestSchema,
  quoteRequestSchema,
} from './booking';

export {
  userRegistrationSchema,
  loginSchema,
} from './auth';
```

## ✅ Best Practices

- **Reuse Common Types**: Use `z.string().email()` instead of regex
- **Add Constraints**: Use `.min()`, `.max()`, `.includes()` for boundaries
- **Document Complex Rules**: Add comments explaining refinements
- **Test Schemas**: Write tests for edge cases
- **Version Changes Carefully**: Schema changes affect API compatibility
- **Use Discriminated Unions**: For complex conditional validation

Example:

```typescript
const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('accept'), worker_id: z.string() }),
  z.object({ type: z.literal('reject'), reason: z.string() }),
]);
```

## 🧪 Testing Schemas

```typescript
import { describe, it, expect } from 'vitest';
import { bookingRequestSchema } from '../booking';

describe('bookingRequestSchema', () => {
  it('should validate correct booking data', () => {
    const valid = {
      service_id: '123e4567-e89b-12d3-a456-426614174000',
      scheduled_date: new Date().toISOString(),
      location: 'Cra 7 #123, Bogotá',
      description: 'Need painting service',
    };
    expect(() => bookingRequestSchema.parse(valid)).not.toThrow();
  });

  it('should reject invalid service_id', () => {
    const invalid = { service_id: 'not-uuid' };
    expect(() => bookingRequestSchema.parse(invalid)).toThrow();
  });
});
```

## 🏗 Building

```bash
# Build package
pnpm build

# Run tests
pnpm test

# Type check
pnpm type-check
```

## 📞 Contributing

1. Create schema file in `src/`
2. Define schemas using Zod
3. Export types from `index.ts`
4. Write tests for schemas
5. Document complex validation rules

## 📚 Resources

- [Zod Documentation](https://zod.dev)
- [Advanced Zod Patterns](https://zod.dev/?id=discriminated-unions)
- [Type Inference](https://zod.dev/?id=type-inference)
