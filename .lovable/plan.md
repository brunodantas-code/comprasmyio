# Reorganização do menu Approvals

## Objetivo
Transformar o menu principal em **Approvals**, reunindo nele três visões operacionais:

1. **Pendentes comigo** — decisões que aguardam o usuário atual.
2. **Em fluxo de Aprovação** — approvals criados pelo usuário atual e ainda não completamente aprovados.
3. **Todos** — visão completa atual, disponível somente para usuários com cargo participante da cadeia de aprovação.

## Alterações
- Renomear **Approvals Pendentes** para **Approvals** no menu principal.
- Mover as visões **Pendentes comigo** e **Solicitações em fluxo** da configuração administrativa para a área principal de Approvals.
- Renomear **Solicitações em fluxo** para **Em fluxo de Aprovação** e filtrar por solicitante atual e status ainda em aprovação.
- Criar o submenu **Todos** após **Em fluxo de Aprovação**, reaproveitando a tabela completa atual.
- Na visão **Todos**, exibir o status da aprovação — incluindo Pendente e Rejeitado — e o aprovador final, em vez de limitar a lista aos pedidos já aprovados.
- Exibir **Todos** apenas quando o cargo do usuário participa da hierarquia de aprovação; Admin mantém acesso.
- Manter no menu administrativo somente as configurações de Organograma e Alçadas de Aprovação.

## Detalhes técnicos
- Reaproveitar as consultas e os componentes atuais de etapas para evitar duplicação.
- Determinar cargo de aprovação pela hierarquia cadastrada, sem depender de nomes fixos de cargos.
- Preservar filtros, ações, relatório expandido e comportamento responsivo da tabela atual.
- Validar os três perfis de visualização, estados vazios, desktop e celular.