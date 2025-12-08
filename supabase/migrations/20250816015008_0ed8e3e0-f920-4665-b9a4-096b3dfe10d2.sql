-- Update produtos table structure to use NUMERIC(12,2) and add new fields
alter table public.produtos
  add column if not exists tipo text not null default 'produto' check (tipo in ('produto','servico')),
  add column if not exists valor_dinheiro_pix numeric(12,2) not null default 0,
  add column if not exists valor_parcelado_6x numeric(12,2) not null default 0,
  add column if not exists garantia_dias integer not null default 90,
  add column if not exists tempo_reparo_minutos integer not null default 60,
  add column if not exists modelo text,
  add column if not exists observacoes text,
  add column if not exists disponivel boolean not null default true;

-- Add updated_at column if it doesn't exist
alter table public.produtos 
  add column if not exists updated_at timestamptz not null default now();

-- Create indexes for performance
create index if not exists idx_produtos_nome_lower on public.produtos (lower(nome));
create index if not exists idx_produtos_tipo on public.produtos (tipo);
create index if not exists idx_produtos_updated_at on public.produtos (updated_at desc);

-- Create updated_at trigger function
create or replace function public.set_updated_at() 
returns trigger 
language plpgsql 
security definer
as $$
begin
  new.updated_at := now();
  return new;
end$$;

-- Drop existing trigger if exists and create new one
drop trigger if exists tg_set_updated_at_produtos on public.produtos;
create trigger tg_set_updated_at_produtos
  before update on public.produtos
  for each row execute function public.set_updated_at();

-- Update RLS policies to be more permissive for authenticated users
drop policy if exists "Anyone can view produtos" on public.produtos;
drop policy if exists "Authenticated users can view produtos" on public.produtos;
drop policy if exists "Authenticated users can insert produtos" on public.produtos;
drop policy if exists "Authenticated users can update produtos" on public.produtos;
drop policy if exists "Authenticated users can delete produtos" on public.produtos;
drop policy if exists "Only admins can insert produtos" on public.produtos;
drop policy if exists "Only admins can update produtos" on public.produtos;
drop policy if exists "Only admins can delete produtos" on public.produtos;

-- Create simplified RLS policies for authenticated users
create policy produtos_read_all on public.produtos 
  for select to authenticated using (true);
create policy produtos_insert_all on public.produtos 
  for insert to authenticated with check (true);
create policy produtos_update_all on public.produtos 
  for update to authenticated using (true) with check (true);
create policy produtos_delete_all on public.produtos 
  for delete to authenticated using (true);

-- Create RPC function for AI agent to query products by name
create or replace function public.produto_por_nome(p_nome text)
returns table (
  nome text,
  tipo text,
  valor_dinheiro_pix numeric(12,2),
  valor_parcelado_6x numeric(12,2),
  garantia_dias int,
  tempo_reparo_minutos int,
  modelo text,
  observacoes text,
  disponivel boolean
) 
language sql 
security definer 
as $$
  select nome, tipo, valor_dinheiro_pix, valor_parcelado_6x,
         garantia_dias, tempo_reparo_minutos, modelo, observacoes, disponivel
  from public.produtos
  where lower(nome) = lower(p_nome)
  limit 1;
$$;

-- Create autocomplete function for products
create or replace function public.buscar_produtos(q text, p_limit int default 10)
returns table (nome text, tipo text) 
language sql 
security definer 
as $$
  select nome, tipo
  from public.produtos
  where nome ilike '%' || q || '%'
  order by nome
  limit p_limit;
$$;