## Objetivo
Criar uma biblioteca de materiais para agilizar o preenchimento de novos pedidos.

## Banco de dados
Nova tabela `materials`:
- `name` (texto, obrigatório)
- `link` (texto, opcional)
- `created_by` (referência ao usuário)
- timestamps padrão

RLS:
- Leitura: todos os usuários autenticados (para poder listar no formulário).
- Insert/Update/Delete: somente admin.
- GRANT para `authenticated` e `service_role`.

## Interface

### Nova aba "Materiais" (visível apenas para admin)
- Lista dos materiais cadastrados (nome + link).
- Botão "Adicionar material" com formulário (nome + link opcional).
- Ações por linha: editar e excluir.

### Formulário de "Novo pedido"
Substituir o input atual de "Nome do item" por um combobox pesquisável:
- Digite para buscar na biblioteca; selecione um material e os campos `item_name` e `item_link` são preenchidos automaticamente.
- Se nada corresponder, o texto digitado vira o nome do item (entrada manual livre) — link pode ser preenchido manualmente como hoje.
- Campo de link permanece editável em ambos os casos.

O `EditRequesterDialog` recebe o mesmo combobox para manter consistência.

## Detalhes técnicos
- Migração SQL única com enum-free `CREATE TABLE public.materials` + GRANTs + RLS + policies usando `has_role(auth.uid(), 'admin')` + trigger de `updated_at`.
- Query `useQuery(['materials'])` carregada no dashboard e reutilizada nos formulários.
- Combobox baseado em `Command` do shadcn (já disponível no projeto) dentro de um `Popover`.
- Nenhuma alteração em `purchase_orders` — a biblioteca só alimenta o formulário; o pedido continua guardando `item_name` e `item_link` como texto (assim editar/excluir um material não afeta pedidos antigos).
