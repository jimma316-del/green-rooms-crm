-- Update role enum constraint on users table
alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
    check (role in ('admin', 'management', 'installer'));

-- Migrate any existing legacy roles
update public.users set role = 'admin'     where role in ('sales', 'operations');
update public.users set role = 'installer' where role = 'site';
