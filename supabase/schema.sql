create extension if not exists "pgcrypto";

create table if not exists student_applications (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  father_name text not null default '',
  roll_number text not null,
  email text not null,
  phone text not null,
  semester text not null,
  document_type text not null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by text,
  rejection_comment text,
  pdf_url text,
  created_at timestamptz not null default now()
);

alter table student_applications add column if not exists rejection_comment text;
alter table student_applications add column if not exists father_name text not null default '';
alter table student_applications add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table student_applications drop constraint if exists student_applications_document_type_check;
alter table student_applications
  add constraint student_applications_document_type_check
  check (document_type in ('bonafide_certificate', 'transcript_request', 'admission_slip', 'dues_letter'));

create table if not exists fee_structures (
  id uuid primary key default gen_random_uuid(),
  course_id text not null,
  batch_year integer not null,
  mode text not null check (mode in ('same_for_all_years', 'year_wise')),
  admission_payment_default integer not null default 10000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, batch_year)
);

create table if not exists fee_structure_years (
  id uuid primary key default gen_random_uuid(),
  fee_structure_id uuid not null references fee_structures(id) on delete cascade,
  year_no integer not null,
  tuition_fee integer not null default 0,
  lab_fee integer not null default 0,
  examination_fee integer not null default 0,
  hostel_fee integer not null default 0,
  transport_fee integer not null default 0,
  other_fee integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fee_structure_id, year_no)
);
