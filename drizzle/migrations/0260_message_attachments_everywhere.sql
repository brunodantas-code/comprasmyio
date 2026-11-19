-- 1) Supply: anexos ligados às mensagens da conversa
create table public.supply_order_attachments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.purchase_orders(id) on delete cascade,
  message_id uuid references public.supply_order_messages(id) on delete set null,
  uploaded_by uuid not null,
  file_name text not null,
  storage_path text not null,
  content_type text not null default 'application/octet-stream',
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.supply_order_attachments to authenticated;
grant all on public.supply_order_attachments to service_role;
alter table public.supply_order_attachments enable row level security;
create policy "supply_attachments_read" on public.supply_order_attachments for select to authenticated using (
  uploaded_by = auth.uid()
  or security_app_access(array['supply','cash_flow'])
  or exists (select 1 from public.purchase_orders o where o.id = supply_order_attachments.order_id and (o.requester_id = auth.uid() or o.recipient_user_id = auth.uid()))
);
create policy "supply_attachments_insert" on public.supply_order_attachments for insert to authenticated with check (
  uploaded_by = auth.uid() and exists (
    select 1 from public.purchase_orders o
    where o.id = supply_order_attachments.order_id
      and (o.requester_id = auth.uid() or o.recipient_user_id = auth.uid()
        or has_role(auth.uid(), 'comprador'::app_role) or has_role(auth.uid(), 'admin'::app_role)
        or can_manage_limits(auth.uid()))
  )
);
create policy "supply_attachments_delete" on public.supply_order_attachments for delete to authenticated using (
  uploaded_by = auth.uid() or has_role(auth.uid(), 'admin'::app_role)
);

-- 2) Mytosis: anexos ligados às mensagens das tarefas internas
create table public.mytosis_task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.mytosis_tasks(id) on delete cascade,
  message_id uuid references public.mytosis_task_messages(id) on delete set null,
  uploaded_by uuid not null,
  file_name text not null,
  storage_path text not null,
  content_type text not null default 'application/octet-stream',
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.mytosis_task_attachments to authenticated;
grant all on public.mytosis_task_attachments to service_role;
alter table public.mytosis_task_attachments enable row level security;
create policy "mytosis_task_attachments_read" on public.mytosis_task_attachments for select to authenticated using (
  mytosis_role(auth.uid()) is not null and exists (select 1 from public.mytosis_tasks t where t.id = mytosis_task_attachments.task_id)
);
create policy "mytosis_task_attachments_insert" on public.mytosis_task_attachments for insert to authenticated with check (
  uploaded_by = auth.uid() and mytosis_role(auth.uid()) is not null
);
create policy "mytosis_task_attachments_delete" on public.mytosis_task_attachments for delete to authenticated using (
  mytosis_can_edit(auth.uid())
);

-- 3) Wishlist: anexos ligados às mensagens das ideias
create table public.wishlist_attachments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.wishlist_ideas(id) on delete cascade,
  message_id uuid references public.wishlist_messages(id) on delete set null,
  uploaded_by uuid not null,
  file_name text not null,
  storage_path text not null,
  content_type text not null default 'application/octet-stream',
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.wishlist_attachments to authenticated;
grant all on public.wishlist_attachments to service_role;
alter table public.wishlist_attachments enable row level security;
create policy "wishlist_attachments_read" on public.wishlist_attachments for select to authenticated using (
  wishlist_can_access() and exists (select 1 from public.wishlist_ideas i where i.id = wishlist_attachments.idea_id)
);
create policy "wishlist_attachments_insert" on public.wishlist_attachments for insert to authenticated with check (
  uploaded_by = auth.uid() and wishlist_can_access()
);
create policy "wishlist_attachments_delete" on public.wishlist_attachments for delete to authenticated using (
  uploaded_by = auth.uid() or is_erp_admin(auth.uid())
);

-- 4) Anexos já existentes passam a poder indicar a mensagem de origem
alter table public.mytosis_node_attachments add column if not exists message_id uuid references public.mytosis_node_messages(id) on delete set null;
alter table public.pm_task_attachments add column if not exists message_id uuid references public.pm_task_messages(id) on delete set null;
alter table public.internal_call_attachments add column if not exists message_id uuid references public.internal_call_messages(id) on delete set null;

-- 5) Pastas privadas: leitura, envio e exclusão dos novos anexos

drop policy if exists "mytosis_attachment_objects_read" on storage.objects;
create policy "mytosis_attachment_objects_read" on storage.objects for select to authenticated using (
  bucket_id = 'mytosis-attachments' and mytosis_role(auth.uid()) is not null
  and (exists (select 1 from public.mytosis_node_attachments a where a.storage_path = storage.objects.name)
    or exists (select 1 from public.mytosis_task_attachments a where a.storage_path = storage.objects.name))
);

drop policy if exists "mytosis_attachment_objects_delete" on storage.objects;
create policy "mytosis_attachment_objects_delete" on storage.objects for delete to authenticated using (
  bucket_id = 'mytosis-attachments' and mytosis_can_edit(auth.uid())
  and (exists (select 1 from public.mytosis_nodes n where n.id::text = (storage.foldername(storage.objects.name))[2])
    or exists (select 1 from public.mytosis_tasks t where t.id::text = (storage.foldername(storage.objects.name))[2]))
);

create policy "internal_call_objects_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'internal-call-attachments'
  and exists (select 1 from public.internal_calls c where c.id::text = (storage.foldername(storage.objects.name))[2])
);

create policy "wishlist_attachment_objects_read" on storage.objects for select to authenticated using (
  bucket_id = 'wishlist-attachments' and wishlist_can_access()
  and (owner_id = (auth.uid())::text or exists (select 1 from public.wishlist_attachments a where a.storage_path = storage.objects.name))
);

create policy "wishlist_attachment_objects_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'wishlist-attachments' and wishlist_can_access() and owner_id = (auth.uid())::text
);

create policy "wishlist_attachment_objects_delete" on storage.objects for delete to authenticated using (
  bucket_id = 'wishlist-attachments' and (owner_id = (auth.uid())::text or is_erp_admin(auth.uid()))
);