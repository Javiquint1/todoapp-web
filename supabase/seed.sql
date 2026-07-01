-- Development seed data for Todero Marketplace.
-- Test admin user:
--   Email: admin@test.toderos.local
--   Password: AdminTest123!

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@test.toderos.local',
  crypt('AdminTest123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Admin de Prueba"}'::jsonb,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now();

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000101',
  '{"sub":"00000000-0000-0000-0000-000000000101","email":"admin@test.toderos.local"}'::jsonb,
  'email',
  now(),
  now(),
  now()
)
ON CONFLICT (provider, provider_id) DO UPDATE
SET
  identity_data = EXCLUDED.identity_data,
  updated_at = now();

INSERT INTO public.profiles (
  id,
  user_id,
  role,
  full_name,
  email,
  phone_number,
  city,
  status,
  metadata
)
VALUES (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000101',
  'ADMIN',
  'Admin de Prueba',
  'admin@test.toderos.local',
  '+57 300 000 0000',
  'Bogota',
  'ACTIVE',
  '{"seed_user":true}'::jsonb
)
ON CONFLICT (user_id) DO UPDATE
SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone_number = EXCLUDED.phone_number,
  city = EXCLUDED.city,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  updated_at = now();
