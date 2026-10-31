-- Lab Equipment Booking: Supabase PostgreSQL schema
-- Run this entire file once in Supabase Dashboard -> SQL Editor -> New query.
create extension if not exists pgcrypto;

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  category varchar(80) not null,
  description varchar(500) not null default '',
  location varchar(120) not null,
  quantity integer not null default 1 check (quantity between 0 and 1000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  student_name varchar(100) not null,
  student_email varchar(254) not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  purpose varchar(500) not null,
  status varchar(20) not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
  booking_code_hash char(64) not null,
  created_at timestamptz not null default now(),
  constraint valid_booking_time check (end_at > start_at)
);

create index if not exists idx_equipment_active_name
  on public.equipment(active, name);
create index if not exists idx_bookings_equipment_time
  on public.bookings(equipment_id, start_at, end_at);
create index if not exists idx_bookings_status
  on public.bookings(status);
create index if not exists idx_bookings_created_at
  on public.bookings(created_at desc);

-- API requests go through the Express server. The server uses a secret key and
-- performs authorization in its admin routes. Do not expose that key in a browser.
-- RLS is enabled as an extra safeguard: anonymous/authenticated browser clients
-- cannot directly read or modify these tables. Server-side service-role access
-- bypasses RLS, so keep the key private and protect all server routes.
alter table public.equipment enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "No direct browser access to equipment" on public.equipment;
drop policy if exists "No direct browser access to bookings" on public.bookings;
create policy "No direct browser access to equipment"
  on public.equipment for all to anon, authenticated using (false) with check (false);
create policy "No direct browser access to bookings"
  on public.bookings for all to anon, authenticated using (false) with check (false);

-- Demo records are inserted only when the equipment table is empty.
insert into public.equipment (name, category, description, location, quantity)
select demo.name, demo.category, demo.description, demo.location, demo.quantity
from (values
  ('Digital Oscilloscope', 'Electronics', 'Observe and analyse electrical signals.', 'Electronics Lab', 2),
  ('Compound Microscope', 'Optical', 'Magnified observation for lab specimens.', 'Biology Lab', 4),
  ('Digital Multimeter', 'Measurement', 'Measure voltage, current and resistance.', 'Electrical Lab', 6),
  ('Arduino Starter Kit', 'Electronics', 'Microcontroller board with basic components.', 'IoT Lab', 5),
  ('3D Printer', 'Fabrication', 'Prototype small models and project components.', 'Innovation Lab', 1),
  ('Soldering Station', 'Electronics', 'Temperature-controlled station for soldering tasks.', 'Electronics Lab', 3)
) as demo(name, category, description, location, quantity)
where not exists (select 1 from public.equipment);
