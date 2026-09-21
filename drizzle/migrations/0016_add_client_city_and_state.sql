ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state char(2);

ALTER TABLE public.clients
  ADD CONSTRAINT clients_state_valid CHECK (
    state IS NULL OR state IN (
      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
      'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
    )
  );

COMMENT ON COLUMN public.clients.city IS 'Cidade do endereço do cliente.';
COMMENT ON COLUMN public.clients.state IS 'UF brasileira do endereço do cliente.';