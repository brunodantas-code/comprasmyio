# Razão social e nome fantasia de clientes

## Objetivo
Adicionar “Razão social” ao cadastro e à edição de clientes. O campo atual `name` continuará sendo o Nome fantasia e seguirá como identificação do cliente em todas as telas, buscas e listas de seleção.

## Alterações
- Adicionar uma coluna opcional de razão social aos clientes existentes, sem alterar os nomes já cadastrados.
- No bloco Novo cliente, posicionar Razão social antes de Nome fantasia.
- No formulário de edição, permitir consultar e alterar os dois nomes.
- Na lista de Clientes, identificar claramente a coluna principal como Nome fantasia e exibir também a Razão social para conferência cadastral.
- Manter todos os demais locais do sistema e listas de seleção usando exclusivamente o Nome fantasia.

## Detalhes técnicos
- Mudança aditiva e compatível com os registros existentes: nova coluna `legal_name` anulável em `clients`.
- `clients.name` permanece como fonte do Nome fantasia, evitando regressões nos vínculos, projetos, solicitações, relatórios e integrações atuais.
- Atualizar os tipos gerados e a consulta compartilhada de clientes para incluir `legal_name` somente onde necessário.
- Validar cadastro, edição e apresentação em tela, além da compilação da aplicação.
