create table public.crm_lotes_custo (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text,
  status text not null default 'exemplo' check (status in ('exemplo','validado','encerrado')),
  vigencia_inicio date not null default current_date,
  vigencia_fim date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.crm_custo_base_produto (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.crm_lotes_custo(id) on delete cascade,
  produto text not null check (produto in ('3F','SWITCH','REMOTE','CENTRAL')),
  componentes_myio numeric(12,2) not null default 0,
  mod_assembling numeric(12,2) not null default 0,
  cif numeric(12,2) not null default 0,
  pre_setup_fabrica numeric(12,2) not null default 0,
  unique (lote_id, produto)
);
create table public.crm_kits (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  grupo text not null,
  produto text not null check (produto in ('3F','SWITCH','REMOTE','CENTRAL')),
  custo_3os_imp numeric(12,2) not null default 0,
  custo_3os_nac numeric(12,2) not null default 0,
  observacoes text,
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.crm_parametros_motor (
  id int primary key default 1 check (id = 1),
  multiplicador_margem_locacao numeric(6,3) not null default 1.8,
  teto_margem_servicos numeric(6,3) not null default 3,
  aliquota_iss_estimada numeric(6,3) not null default 5,
  faixa_locacao_min numeric(6,3) not null default 1.5,
  faixa_locacao_max numeric(6,3) not null default 2.5,
  circuitos_por_central int not null default 400,
  custo_hora_padrao numeric(12,2) not null default 120,
  custo_mensal_servir_padrao numeric(12,2) not null default 1500,
  updated_at timestamptz not null default now()
);
insert into public.crm_parametros_motor (id) values (1);
create table public.crm_tabela_precos (
  id uuid primary key default gen_random_uuid(),
  categoria text not null default 'produto_myio' check (categoria in ('produto_myio','produto_terceiro','insumo','mao_de_obra')),
  nome text not null,
  modelo text,
  unidade text not null default 'un',
  preco_setup numeric(12,2) not null default 0,
  preco_mensal numeric(12,2) not null default 0,
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.crm_tabela_precos_custo (
  item_id uuid primary key references public.crm_tabela_precos(id) on delete cascade,
  kit_id uuid references public.crm_kits(id) on delete set null,
  custo_manual numeric(12,2),
  markup_percentual numeric(6,2) not null default 65,
  updated_at timestamptz not null default now()
);
create table public.crm_proposta_memoria (
  proposta_id uuid primary key references public.crm_propostas(id) on delete cascade,
  frete_site numeric(12,2) not null default 0,
  horas_implantacao numeric(10,2) not null default 0,
  custo_hora numeric(12,2) not null default 0,
  mobilizacao numeric(12,2) not null default 0,
  custo_mensal_servir numeric(12,2) not null default 0,
  centrais_existentes int not null default 0,
  resultado jsonb not null default '{}'::jsonb,
  lote_codigo text,
  calculado_em timestamptz not null default now()
);
alter table public.crm_proposta_itens add column tabela_item_id uuid references public.crm_tabela_precos(id) on delete set null;

grant select on public.crm_tabela_precos to authenticated;
grant insert, update, delete on public.crm_tabela_precos to authenticated;
grant select, insert, update, delete on public.crm_lotes_custo, public.crm_custo_base_produto, public.crm_kits, public.crm_tabela_precos_custo, public.crm_proposta_memoria to authenticated;
grant select, update on public.crm_parametros_motor to authenticated;
grant all on public.crm_lotes_custo, public.crm_custo_base_produto, public.crm_kits, public.crm_parametros_motor, public.crm_tabela_precos, public.crm_tabela_precos_custo, public.crm_proposta_memoria to service_role;

alter table public.crm_lotes_custo enable row level security;
alter table public.crm_custo_base_produto enable row level security;
alter table public.crm_kits enable row level security;
alter table public.crm_parametros_motor enable row level security;
alter table public.crm_tabela_precos enable row level security;
alter table public.crm_tabela_precos_custo enable row level security;
alter table public.crm_proposta_memoria enable row level security;

create policy crm_tp_select on public.crm_tabela_precos for select to authenticated using (private.has_app_access(auth.uid(), 'crm') or public.is_erp_admin(auth.uid()));
create policy crm_tp_admin on public.crm_tabela_precos for all to authenticated using (public.is_erp_admin(auth.uid())) with check (public.is_erp_admin(auth.uid()));
create policy crm_lotes_admin on public.crm_lotes_custo for all to authenticated using (public.is_erp_admin(auth.uid())) with check (public.is_erp_admin(auth.uid()));
create policy crm_cbp_admin on public.crm_custo_base_produto for all to authenticated using (public.is_erp_admin(auth.uid())) with check (public.is_erp_admin(auth.uid()));
create policy crm_kits_admin on public.crm_kits for all to authenticated using (public.is_erp_admin(auth.uid())) with check (public.is_erp_admin(auth.uid()));
create policy crm_par_select on public.crm_parametros_motor for select to authenticated using (public.is_erp_admin(auth.uid()));
create policy crm_par_update on public.crm_parametros_motor for update to authenticated using (public.is_erp_admin(auth.uid())) with check (public.is_erp_admin(auth.uid()));
create policy crm_tpc_admin on public.crm_tabela_precos_custo for all to authenticated using (public.is_erp_admin(auth.uid())) with check (public.is_erp_admin(auth.uid()));
create policy crm_mem_admin on public.crm_proposta_memoria for all to authenticated using (public.is_erp_admin(auth.uid())) with check (public.is_erp_admin(auth.uid()));

create trigger crm_lotes_updated before update on public.crm_lotes_custo for each row execute function public.set_updated_at();
create trigger crm_kits_updated before update on public.crm_kits for each row execute function public.set_updated_at();
create trigger crm_par_updated before update on public.crm_parametros_motor for each row execute function public.set_updated_at();
create trigger crm_tp_updated before update on public.crm_tabela_precos for each row execute function public.set_updated_at();
create trigger crm_tpc_updated before update on public.crm_tabela_precos_custo for each row execute function public.set_updated_at();