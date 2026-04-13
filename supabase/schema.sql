create extension if not exists "pgcrypto";

create table if not exists student_applications (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  roll_number text not null,
  email text not null,
  phone text not null,
  semester text not null,
  document_type text not null check (document_type in ('bonafide_certificate', 'transcript_request')),
  notes text,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by text,
  rejection_comment text,
  pdf_url text,
  created_at timestamptz not null default now()
);

alter table student_applications add column if not exists rejection_comment text;
