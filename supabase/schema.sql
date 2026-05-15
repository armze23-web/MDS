create table if not exists public.zort_orders (
  source text not null,
  order_id text not null,
  order_number text,
  order_date date,
  sales_channel text,
  customer_province text,
  created_by text,
  total_amount numeric,
  raw_json jsonb,
  synced_at timestamptz not null default now(),
  primary key (source, order_id)
);

create table if not exists public.zort_movement_orders (
  source text not null,
  order_id text not null,
  action_date date,
  raw_json jsonb,
  synced_at timestamptz not null default now(),
  primary key (source, order_id)
);

create table if not exists public.zort_movement_items (
  source text not null,
  order_id text not null,
  product_id text not null,
  action_date date,
  product_sku text,
  product_name text,
  quantity numeric,
  unit_price numeric,
  discount numeric,
  line_total numeric,
  raw_json jsonb,
  synced_at timestamptz not null default now(),
  primary key (source, order_id, product_id)
);

create table if not exists public.zort_daily_summaries (
  source text not null,
  date_after date not null,
  date_before date not null,
  order_count integer not null default 0,
  total_order_amount numeric not null default 0,
  movement_row_count integer not null default 0,
  total_movement_quantity numeric not null default 0,
  total_movement_amount numeric not null default 0,
  summary_json jsonb,
  synced_at timestamptz not null default now(),
  primary key (source, date_after, date_before)
);

create table if not exists public.zort_sync_runs (
  id bigint generated always as identity primary key,
  pipeline_name text not null,
  source text not null,
  date_after date not null,
  date_before date not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  orders_count integer not null default 0,
  movement_count integer not null default 0,
  error_message text
);

create index if not exists zort_orders_order_date_idx
  on public.zort_orders (order_date);

create index if not exists zort_movement_items_action_date_idx
  on public.zort_movement_items (action_date);

create index if not exists zort_sync_runs_pipeline_started_idx
  on public.zort_sync_runs (pipeline_name, started_at desc);

alter table public.zort_orders enable row level security;
alter table public.zort_movement_orders enable row level security;
alter table public.zort_movement_items enable row level security;
alter table public.zort_daily_summaries enable row level security;
alter table public.zort_sync_runs enable row level security;
