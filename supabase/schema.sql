-- CareDesk Supabase schema seed
-- Run in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.patients (
  id text primary key,
  name text not null,
  age integer,
  gender text,
  blood text,
  phone text,
  emergency text,
  address text,
  allergies text,
  medications text,
  history text,
  labsummary text,
  labupdatedat timestamptz,
  fingerprinttemplateid integer,
  registeredat timestamptz default now(),
  registeredby text default 'Receptionist'
);

create table if not exists public.queue (
  id uuid primary key default gen_random_uuid(),
  patientid text not null references public.patients(id) on delete cascade,
  patientname text not null,
  status text not null default 'waiting' check (status in ('waiting','in-consult','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('normal','urgent')),
  token integer not null,
  checkedinat timestamptz default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  patientid text not null references public.patients(id) on delete cascade,
  patientname text not null,
  date timestamptz default now(),
  datelabel text,
  doctor text,
  vitals text,
  conditions text,
  medications text,
  notes text
);

create index if not exists patients_registeredat_idx on public.patients (registeredat desc);
create index if not exists queue_patientid_idx on public.queue (patientid);
create index if not exists queue_status_idx on public.queue (status);
create index if not exists visits_patientid_idx on public.visits (patientid);

-- Sample seed data
insert into public.patients (id, name, age, gender, blood, phone, emergency, address, allergies, medications, history, labsummary, labupdatedat, fingerprinttemplateid, registeredat, registeredby)
values
  ('P1001', 'Dr. Aisha Khan', 36, 'Female', 'A+', '0712345678', 'Hamza Khan', 'Nairobi, Kenya', 'None', 'Vitamin C', 'Routine wellness check', null, null, 101, now() - interval '7 days', 'Receptionist')
on conflict (id) do nothing;

insert into public.queue (patientid, patientname, status, priority, token, checkedinat)
values
  ('P1001', 'Dr. Aisha Khan', 'waiting', 'urgent', 1, now() - interval '12 minutes')
on conflict do nothing;

insert into public.visits (patientid, patientname, date, datelabel, doctor, vitals, conditions, medications, notes)
values
  ('P1001', 'Dr. Aisha Khan', now() - interval '3 days', 'Mon Sep 26 2026', 'Dr. Ada James', 'BP 118/76; HR 74', 'General wellness review', 'Vitamin C', 'Patient advised to continue routine monitoring')
on conflict do nothing;
