# Supabase Configuration & Migrations

SQL migrations and Supabase infrastructure configuration for Todero Marketplace.

## 📋 Overview

This directory contains:

- **SQL Migrations**: Versioned database schema changes
- **Supabase Config**: Project settings and policies
- **RLS Policies**: Row-level security policies
- **Functions**: PostgreSQL functions for complex operations

## 📁 Structure

```
supabase/
├── migrations/               # SQL migration files
│   ├── 20240101_001_init_users.sql
│   ├── 20240101_002_init_workers.sql
│   ├── 20240101_003_init_bookings.sql
│   └── ...
├── functions/               # PostgreSQL functions (future)
├── policies/                # RLS policies (future)
└── seed.sql                 # Sample data for development
```

## 🔄 Migration Workflow

### Creating Migrations

```bash
# Create migration file
supabase migration new migration_name

# File created: supabase/migrations/[timestamp]_migration_name.sql
```

### Structure of a Migration

```sql
-- Migrations should be idempotent (safe to re-run)
-- Always add IF NOT EXISTS / IF EXISTS checks

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    -- ... columns
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policy
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own record"
    ON public.users FOR SELECT
    USING (auth.uid() = id);
```

### Running Migrations Locally

```bash
# Link to Supabase project
supabase link --project-id your-project-id

# Apply migrations
supabase migration list
supabase migration up
```

### Pushing Migrations to Production

```bash
# Push to linked project
supabase db push

# Or use Supabase CLI with confirm
supabase db push --dry-run  # See what will change
supabase db push            # Apply changes
```

## 📊 Database Schema Overview

The schema is organized into logical groups:

### User Management Tables

- `auth.users` - Supabase auth users (managed by Supabase)
- `users` - Application user profiles
- `customers` - Customer-specific data
- `workers` - Worker-specific data
- `admins` - Admin user data

### Service & Booking Tables

- `service_categories` - Available service types
- `worker_services` - Services offered by workers
- `bookings` - Service bookings
- `booking_reviews` - Customer and worker reviews

### Financial Tables

- `payments` - Payment transactions
- `payouts` - Worker payment distributions
- `invoices` - Service invoices

### Verification Tables

- `verification_submissions` - Worker verification records
- `verification_documents` - Uploaded documents
- `background_checks` - Background check results
- `references` - Professional references

### Dispute & Safety Tables

- `disputes` - Filed disputes
- `dispute_evidence` - Dispute evidence files
- `safety_reports` - Safety incidents
- `admin_actions` - Admin moderation actions

### Communication Tables

- `messages` - In-app messages
- `notifications` - User notifications

## 🔐 Row-Level Security (RLS)

RLS policies control data access at the database level:

### Customer Can Only See Own Data

```sql
CREATE POLICY "Customers can view own profile"
    ON public.users FOR SELECT
    USING (
        auth.uid() = id 
        OR EXISTS (
            SELECT 1 FROM public.customers 
            WHERE customers.user_id = users.id 
            AND customers.user_id = auth.uid()
        )
    );
```

### Workers Can See Their Jobs

```sql
CREATE POLICY "Workers can view own bookings"
    ON public.bookings FOR SELECT
    USING (worker_id = (
        SELECT id FROM public.workers 
        WHERE user_id = auth.uid()
    ));
```

### Admins Have Full Access

```sql
CREATE POLICY "Admins can access all records"
    ON public.bookings FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.admins 
        WHERE user_id = auth.uid()
    ));
```

## 🔧 Common Operations

### View Current Schema

```bash
# Connect to Supabase database and run:
\dt public.*     -- List tables
\d public.users  -- Describe table structure
```

### Reset Database (Development Only)

```bash
# Remove all data (be careful!)
supabase db reset

# Or use Supabase dashboard
# Settings > Database > Reset
```

### Seed Development Data

```bash
# Add sample data for testing
supabase db push

# Then import seed data
psql [connection-string] < supabase/seed.sql
```

### Create Backup

```bash
# Supabase automatically creates daily backups
# Download backup via dashboard:
# Settings > Backups > Download

# Or via CLI (with Supabase Pro):
supabase projects download-data
```

## 📚 Migration Examples

### Add New Column

```sql
-- migrations/[timestamp]_add_worker_bio.sql
ALTER TABLE public.workers 
ADD COLUMN bio TEXT;

-- Make it not null with default
ALTER TABLE public.workers 
ALTER COLUMN bio SET NOT NULL DEFAULT '';
```

### Create Index for Performance

```sql
-- migrations/[timestamp]_add_booking_indexes.sql
CREATE INDEX idx_bookings_worker_id 
ON public.bookings(worker_id);

CREATE INDEX idx_bookings_status 
ON public.bookings(status);

CREATE INDEX idx_bookings_created_at 
ON public.bookings(created_at DESC);
```

### Add Constraint

```sql
-- migrations/[timestamp]_add_constraints.sql
ALTER TABLE public.bookings
ADD CONSTRAINT check_positive_amount
CHECK (total_amount > 0);
```

### Rename Table/Column

```sql
-- migrations/[timestamp]_rename_columns.sql
ALTER TABLE public.users 
RENAME COLUMN phone_no TO phone_number;
```

## 🚀 Best Practices

1. **One Change Per Migration**: Single responsibility
   ```
   ✅ 001_create_users_table.sql
   ❌ 001_create_users_and_workers.sql
   ```

2. **Idempotent Operations**: Always use IF (NOT) EXISTS
   ```sql
   ✅ CREATE TABLE IF NOT EXISTS ...
   ✅ DROP TABLE IF EXISTS ...
   ❌ CREATE TABLE ...
   ```

3. **Reversible Migrations**: Consider rollback scenarios
   ```sql
   -- Easy to reverse
   ALTER TABLE users ADD COLUMN optional_field TEXT;
   
   -- Hard to reverse (data loss risk)
   ALTER TABLE users DROP COLUMN required_field;
   ```

4. **Test Locally First**: Apply migrations to local DB before production

5. **Meaningful Names**: Clear description in filename
   ```
   ✅ add_phone_verification_field.sql
   ❌ update_users.sql
   ```

6. **Add Comments**: Document complex schema changes
   ```sql
   -- This table tracks real-time worker locations
   -- Location data expires after 1 hour for privacy
   CREATE TABLE worker_locations (...)
   ```

## 🔗 Environment Setup

### Local Development

```bash
# Start local Supabase (requires Docker)
supabase start

# View database
supabase db diff

# Apply migrations
supabase migration up
```

### Production

```bash
# Link to production project
supabase link --project-id production-id

# Review changes
supabase db push --dry-run

# Push to production
supabase db push
```

## 📊 Monitoring

### Check Migration Status

```bash
supabase migration list
```

### View Recent Queries

```bash
-- In Supabase dashboard
Settings > Database > Query Performance

-- Or run in psql
SELECT query, calls, mean_time FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;
```

### Monitor Connections

```bash
SELECT datname, usename, count(*) as connections
FROM pg_stat_activity
GROUP BY datname, usename;
```

## 🧪 Testing Database Changes

### Local Test Cycle

```bash
# 1. Create migration
supabase migration new test_feature

# 2. Edit migration file with SQL

# 3. Apply locally
supabase migration up

# 4. Test with app code
pnpm dev

# 5. If good, commit
git add supabase/migrations
git commit -m "Add test feature migration"

# 6. Deploy to staging
# 7. Deploy to production
```

## 📞 Troubleshooting

### Migration Failed

```bash
# Check error in Supabase dashboard
# Settings > Database > Migrations

# Or check logs
supabase migration list --verbose

# Reset (development only)
supabase db reset
```

### Performance Issues After Migration

```bash
-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('public.large_table'));

-- Add index
CREATE INDEX idx_column ON public.table_name(column);
```

## 📚 Resources

- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)

## 📝 Deployment Checklist

- [ ] Migration tested locally
- [ ] Schema changes reviewed
- [ ] RLS policies configured
- [ ] Indexes created for new columns
- [ ] Backup exists
- [ ] Dry-run successful
- [ ] Monitoring set up
- [ ] Rollback plan documented
