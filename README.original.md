# Web App - Todero Marketplace

Customer and worker web application built with **Next.js 14** and the **App Router**.

## 📱 Overview

The web application serves two primary user groups:

- **Customers**: Browse services, book workers, manage bookings, rate services
- **Workers**: Create profiles, accept jobs, manage availability, track earnings

## 🚀 Features (Planned)

- User authentication and role-based access
- Service discovery and search
- Booking and quote management
- Real-time notifications
- Payment integration
- Rating and review system
- Admin dashboard
- Worker verification status display

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS (to be configured)
- **UI Components**: Shadcn/ui (to be configured)
- **State Management**: React Context + Hooks (to be extended)
- **API**: REST (Supabase)
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)

## 📁 Project Structure

```
apps/web/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── (auth)/       # Authentication pages
│   │   ├── (customer)/   # Customer routes
│   │   ├── (worker)/     # Worker routes
│   │   ├── (admin)/      # Admin dashboard
│   │   └── layout.tsx    # Root layout
│   ├── components/       # Shared UI components
│   ├── lib/              # Utility functions
│   ├── hooks/            # Custom React hooks
│   └── styles/           # Global styles
├── public/               # Static assets
└── package.json
```

## 🚦 Getting Started

### Development

```bash
# From monorepo root
pnpm --filter web dev

# Or from app directory
cd apps/web
pnpm dev
```

Server runs at: `http://localhost:3000`

### Building

```bash
pnpm --filter web build
pnpm --filter web start
```

## 🔄 Dependency on Shared Packages

```typescript
// Import types from @shared/types
import type { User, Booking } from '@shared/types';

// Import validation schemas
import { bookingSchema } from '@shared/validation';

// Import database helpers
import { createSupabaseClient } from '@shared/database';
```

## 📝 Next Steps

1. [ ] Configure Next.js with image optimization
2. [ ] Set up TailwindCSS and Shadcn/ui
3. [ ] Create authentication flow
4. [ ] Build page layouts
5. [ ] Integrate with shared packages
6. [ ] Set up API routes
7. [ ] Implement SSR/SSG strategy
8. [ ] Add error boundaries and loading states
9. [ ] Performance optimization
10. [ ] SEO configuration

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)
- [TypeScript Support](https://nextjs.org/docs/basic-features/typescript)
