create table public.crm_templates_proposta (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  introducao text,
  escopo text,
  condicoes_padrao jsonb not null default '{"contrato_meses":36,"parcelas_setup":3,"validade_dias":30}'::jsonb,
  ativo boolean not null default true,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.crm_templates_proposta to authenticated;
grant all on public.crm_templates_proposta to service_role;
alter table public.crm_templates_proposta enable row level security;
create policy crm_tpl_select on public.crm_templates_proposta for select to authenticated using (private.has_app_access(auth.uid(), 'crm'));
create policy crm_tpl_insert on public.crm_templates_proposta for insert to authenticated with check (public.is_erp_admin(auth.uid()));
create policy crm_tpl_update on public.crm_templates_proposta for update to authenticated using (public.is_erp_admin(auth.uid())) with check (public.is_erp_admin(auth.uid()));
create policy crm_tpl_delete on public.crm_templates_proposta for delete to authenticated using (public.is_erp_admin(auth.uid()));
create trigger crm_tpl_updated before update on public.crm_templates_proposta for each row execute function public.set_updated_at();

insert into public.crm_templates_proposta (codigo, nome, introducao, escopo, condicoes_padrao) values
('BAS', 'MYIO BAS',
 'A MYIO apresenta a {{empresa}} sua proposta para implantação da plataforma MYIO BAS — sistema de automação predial (Building Automation System) com telemetria de energia, água, HVAC e equipamentos críticos, via rede wireless RF Mesh proprietária.',
 'Fornecimento, instalação e ativação dos dispositivos listados; acesso à plataforma MYIO (web e mobile) com dashboards, alertas e relatórios; suporte técnico e manutenção dos dispositivos durante a vigência do contrato; conectividade 4G/5G inclusa na Central de Automação.',
 '{"contrato_meses":12,"parcelas_setup":2,"validade_dias":30}'),
('SHOPPINGS', 'MYIO Shoppings',
 'A MYIO apresenta ao {{empresa}} sua proposta para implantação da plataforma MYIO Shoppings — medição remota e automação de energia, água e equipamentos de lojas, quiosques e áreas comuns, com rateio automático e alertas em tempo real.',
 'Fornecimento, instalação e ativação dos dispositivos listados; medição remota individualizada de lojas e quiosques; relatórios de rateio de energia e água; monitoramento de escadas rolantes, elevadores, chillers, bombas e reservatórios; acesso à plataforma MYIO (web e mobile); suporte técnico e manutenção durante a vigência do contrato.',
 '{"contrato_meses":36,"parcelas_setup":3,"validade_dias":30}'),
('EXPANSAO', 'Proposta de Expansão (Aditivo)',
 'Proposta de expansão do escopo contratado por {{empresa}}, na forma de aditivo {{contrato_referencia}}, com os itens incrementais descritos abaixo. Condições comerciais, SLAs, canais de suporte, reajuste e garantia seguem o contrato vigente.',
 'Fornecimento, instalação e ativação dos itens incrementais listados, integrados à plataforma MYIO já em operação na unidade.',
 '{"contrato_meses":36,"parcelas_setup":1,"validade_dias":30}'),
('REALOCACAO', 'Realocação',
 'Esta proposta é um aditivo de realocação de pontos {{contrato_referencia}} entre a MYIO Automação e {{empresa}}, reposicionando pontos de medição da plataforma já em operação no empreendimento, por meio da realocação de dispositivos já instalados, sem fornecimento de novos equipamentos, com aproveitamento integral da infraestrutura existente (rede RF Mesh e Central de Automação) e sem alteração da assinatura mensal vigente.',
 null,
 '{"contrato_meses":36,"parcelas_setup":1,"validade_dias":30}');

create sequence public.crm_propostas_numero_seq start 1022;
grant usage on sequence public.crm_propostas_numero_seq to authenticated;

create table public.crm_propostas (
  id uuid primary key default gen_random_uuid(),
  numero text not null default ('MYIO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.crm_propostas_numero_seq')::text, 4, '0')),
  versao integer not null default 1,
  oportunidade_id uuid not null references public.crm_oportunidades(id),
  template_id uuid references public.crm_templates_proposta(id),
  status text not null default 'rascunho' check (status in ('rascunho','enviada','aceita','recusada')),
  data_proposta date not null default current_date,
  condicoes jsonb not null default '{"contrato_meses":36,"parcelas_setup":3,"validade_dias":30}'::jsonb,
  total_setup numeric(14,2) not null default 0,
  total_mensal numeric(14,2) not null default 0,
  incompleta boolean not null default false,
  observacoes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (numero, versao)
);
create index crm_propostas_op_idx on public.crm_propostas (oportunidade_id);
grant select, insert, update, delete on public.crm_propostas to authenticated;
grant all on public.crm_propostas to service_role;
alter table public.crm_propostas enable row level security;
create policy crm_prop_select on public.crm_propostas for select to authenticated using (private.has_app_access(auth.uid(), 'crm'));
create policy crm_prop_insert on public.crm_propostas for insert to authenticated with check (private.has_app_access(auth.uid(), 'crm'));
create policy crm_prop_update on public.crm_propostas for update to authenticated using (private.has_app_access(auth.uid(), 'crm')) with check (private.has_app_access(auth.uid(), 'crm'));
create policy crm_prop_delete on public.crm_propostas for delete to authenticated using (private.has_app_access(auth.uid(), 'crm') and status = 'rascunho');
create trigger crm_prop_updated before update on public.crm_propostas for each row execute function public.set_updated_at();

create table public.crm_proposta_itens (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references public.crm_propostas(id) on delete cascade,
  categoria text not null default 'produto_myio',
  nome text not null,
  modelo text,
  unidade text not null default 'un',
  quantidade numeric(12,2) not null default 1 check (quantidade >= 0),
  preco_setup_unit numeric(12,2) not null default 0 check (preco_setup_unit >= 0),
  preco_mensal_unit numeric(12,2) not null default 0 check (preco_mensal_unit >= 0),
  ambiente text,
  observacao text,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
create index crm_prop_itens_idx on public.crm_proposta_itens (proposta_id, ordem);
grant select, insert, update, delete on public.crm_proposta_itens to authenticated;
grant all on public.crm_proposta_itens to service_role;
alter table public.crm_proposta_itens enable row level security;
create policy crm_prop_itens_select on public.crm_proposta_itens for select to authenticated using (private.has_app_access(auth.uid(), 'crm'));
create policy crm_prop_itens_insert on public.crm_proposta_itens for insert to authenticated with check (private.has_app_access(auth.uid(), 'crm'));
create policy crm_prop_itens_update on public.crm_proposta_itens for update to authenticated using (private.has_app_access(auth.uid(), 'crm')) with check (private.has_app_access(auth.uid(), 'crm'));
create policy crm_prop_itens_delete on public.crm_proposta_itens for delete to authenticated using (private.has_app_access(auth.uid(), 'crm'));

create table public.crm_proposta_pendencias (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references public.crm_propostas(id) on delete cascade,
  texto text not null check (length(trim(texto)) > 0),
  status text not null default 'aberta' check (status in ('aberta','resolvida','nao_se_aplica')),
  resolucao text,
  resolvido_por uuid,
  resolvido_em timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index crm_prop_pend_idx on public.crm_proposta_pendencias (proposta_id);
grant select, insert, update, delete on public.crm_proposta_pendencias to authenticated;
grant all on public.crm_proposta_pendencias to service_role;
alter table public.crm_proposta_pendencias enable row level security;
create policy crm_prop_pend_select on public.crm_proposta_pendencias for select to authenticated using (private.has_app_access(auth.uid(), 'crm'));
create policy crm_prop_pend_insert on public.crm_proposta_pendencias for insert to authenticated with check (private.has_app_access(auth.uid(), 'crm'));
create policy crm_prop_pend_update on public.crm_proposta_pendencias for update to authenticated using (private.has_app_access(auth.uid(), 'crm')) with check (private.has_app_access(auth.uid(), 'crm'));
create policy crm_prop_pend_delete on public.crm_proposta_pendencias for delete to authenticated using (private.has_app_access(auth.uid(), 'crm'));

-- Itens só mudam com a proposta em rascunho; totais recalculados no banco.
create or replace function public.crm_proposta_itens_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare _pid uuid := coalesce(new.proposta_id, old.proposta_id);
begin
  if tg_op = 'UPDATE' and new.proposta_id <> old.proposta_id then raise exception 'Item não pode mudar de proposta'; end if;
  if (select status from public.crm_propostas where id = _pid) <> 'rascunho' then
    raise exception 'Somente propostas em rascunho podem ter itens alterados';
  end if;
  return coalesce(new, old);
end $$;
create trigger crm_prop_itens_guard before insert or update or delete on public.crm_proposta_itens for each row execute function public.crm_proposta_itens_guard();

create or replace function public.crm_proposta_totais()
returns trigger language plpgsql security definer set search_path = public as $$
declare _pid uuid := coalesce(new.proposta_id, old.proposta_id);
begin
  update public.crm_propostas p set
    total_setup = coalesce((select round(sum(quantidade * preco_setup_unit), 2) from public.crm_proposta_itens where proposta_id = _pid), 0),
    total_mensal = coalesce((select round(sum(quantidade * preco_mensal_unit), 2) from public.crm_proposta_itens where proposta_id = _pid), 0)
  where p.id = _pid;
  return null;
end $$;
create trigger crm_prop_itens_totais after insert or update or delete on public.crm_proposta_itens for each row execute function public.crm_proposta_totais();

-- Pendências abertas deixam a proposta incompleta; resolução registra quem/quando.
create or replace function public.crm_proposta_pendencia_resolver()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status <> 'aberta' and (tg_op = 'INSERT' or old.status = 'aberta') then
    new.resolvido_por := auth.uid(); new.resolvido_em := now();
  elsif new.status = 'aberta' then
    new.resolvido_por := null; new.resolvido_em := null; new.resolucao := null;
  end if;
  return new;
end $$;
create trigger crm_prop_pend_resolver before insert or update on public.crm_proposta_pendencias for each row execute function public.crm_proposta_pendencia_resolver();

create or replace function public.crm_proposta_incompleta()
returns trigger language plpgsql security definer set search_path = public as $$
declare _pid uuid := coalesce(new.proposta_id, old.proposta_id);
begin
  update public.crm_propostas set incompleta = exists (select 1 from public.crm_proposta_pendencias where proposta_id = _pid and status = 'aberta') where id = _pid;
  return null;
end $$;
create trigger crm_prop_pend_incompleta after insert or update or delete on public.crm_proposta_pendencias for each row execute function public.crm_proposta_incompleta();

-- Proposta incompleta não sai de rascunho; número/versão/oportunidade são fixos.
create or replace function public.crm_proposta_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.numero <> old.numero or new.versao <> old.versao or new.oportunidade_id <> old.oportunidade_id then
    raise exception 'Número, versão e oportunidade da proposta não podem ser alterados';
  end if;
  if new.status <> 'rascunho' and new.incompleta then
    raise exception 'Resolva as pendências antes de enviar a proposta';
  end if;
  return new;
end $$;
create trigger crm_prop_guard before update on public.crm_propostas for each row execute function public.crm_proposta_guard();

-- Linha do tempo da oportunidade: criação e mudança de status.
create or replace function public.crm_proposta_atividade()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.crm_atividades (oportunidade_id, tipo, autor_id, payload)
    values (new.oportunidade_id, 'proposta_gerada', coalesce(auth.uid(), new.created_by), jsonb_build_object('proposta_id', new.id, 'numero', new.numero, 'versao', new.versao));
  elsif new.status <> old.status then
    insert into public.crm_atividades (oportunidade_id, tipo, autor_id, payload)
    values (new.oportunidade_id, 'sistema', auth.uid(), jsonb_build_object('evento', 'proposta_status', 'proposta_id', new.id, 'numero', new.numero, 'versao', new.versao, 'de', old.status, 'para', new.status, 'total_setup', new.total_setup, 'total_mensal', new.total_mensal));
  end if;
  return null;
end $$;
create trigger crm_prop_atividade after insert or update of status on public.crm_propostas for each row execute function public.crm_proposta_atividade();

revoke execute on function public.crm_proposta_itens_guard() from public, anon, authenticated;
revoke execute on function public.crm_proposta_totais() from public, anon, authenticated;
revoke execute on function public.crm_proposta_incompleta() from public, anon, authenticated;
revoke execute on function public.crm_proposta_atividade() from public, anon, authenticated;