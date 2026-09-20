ALTER TABLE public.clients
ADD COLUMN legal_name text;

COMMENT ON COLUMN public.clients.legal_name IS 'Razão social do cliente; o campo name permanece como nome fantasia exibido no sistema.';