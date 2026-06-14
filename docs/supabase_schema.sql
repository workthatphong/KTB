create table if not exists public.source_files (
  source_id text primary key,
  file_name text not null unique,
  file_ext text,
  uploaded_at text not null,
  total_rows integer not null default 0,
  total_pages integer not null default 0
);

create table if not exists public.source_pages (
  source_id text not null,
  page_name text not null,
  row_count integer not null default 0,
  primary key (source_id, page_name)
);

create table if not exists public.unified_rows (
  row_id bigint primary key,
  source_id text not null,
  file_name text not null,
  page_name text not null,
  row_number integer not null,
  data_json text not null,
  ingested_at text not null
);

create index if not exists idx_unified_rows_file_page
  on public.unified_rows (file_name, page_name);

create index if not exists idx_unified_rows_source
  on public.unified_rows (source_id);

create table if not exists public.connected_sheets (
  connection_id text primary key,
  url text not null,
  spreadsheet_id text not null,
  label text not null,
  connected_at text not null,
  last_sync_at text,
  last_sync_rows integer default 0,
  last_sync_pages integer default 0,
  is_active integer not null default 1
);

create table if not exists public.dashboard_meta_state (
  id text primary key,
  updated_at timestamptz not null,
  row_count integer not null default 0,
  source_count integer not null default 0,
  algorithm_version text not null default '',
  payload_json text
);

alter table public.dashboard_meta_state
  add column if not exists algorithm_version text not null default '';

alter table public.dashboard_meta_state
  add column if not exists payload_json text;
