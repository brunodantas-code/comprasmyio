# Evolução do myio Projects em fases

## O que já existe
- Fases, tarefas, responsáveis, datas previstas e realizadas, marcos e calendário por projeto.
- Gantt com alteração de datas/durações; dependências Término-a-Início com intervalo.
- Caminho crítico e folgas para esse modelo de dependências.
- Equipe, recursos, taxas, custos e avisos de sobrecarga.
- Linhas de base com datas, recursos e custos; histórico de alterações.
- Premissas de instalação com produtividade, homem-hora e equipe estimada, importando visitas autorizadas do Site Survey.

## Fase 1 — Planejamento técnico
- EAP hierárquica: fases, pacotes, tarefas e subtarefas, com recuo, expansão e numeração CDE, sem limite comercial de níveis.
- Dependências TI, II, TT e IT, com lag positivo e lead negativo, validadas contra ciclos.
- Adaptar cálculo de datas, CPM e folgas aos quatro vínculos; testar calendários, marcos e combinações.
- Comparar linhas de base por datas, esforço e custos; manter snapshots anteriores intactos.
- Selecionar predecessora/sucessora no Gantt para cadastrar vínculos diretamente, sem substituir a edição por formulário.

## Fase 2 — Visões e capacidade
- Kanban com colunas configuráveis e movimentação persistida.
- Lista com edição em lote de datas, responsáveis e situação; campos personalizados configuráveis.
- Calendário mensal/semanal com tarefas e marcos.
- Painel de carga por profissional, capacidade diária e ajuste de alocação; sugerir nivelamento antes de aplicar mudanças.

## Fase 3 — Colaboração
- Perguntas/respostas por tarefa, participantes, menções e pendências pessoais, reutilizando o padrão Code.
- Anexos privados por tarefa, com controle de acesso e download pelo nome original.
- Links e integrações Google Drive, OneDrive e Dropbox somente após conexão autorizada de cada serviço; não solicitar senhas.

## Fase 4 — Alertas e automações
- Alertas configuráveis de vencimento, menções e mudança do caminho crítico, aplicados também na Home/Central.
- E-mail e push com preferências e prevenção de duplicidades; conexão/permissão de push quando necessária.
- Regras simples de condição/ação com histórico: conclusão notifica gestor e libera a próxima tarefa quando todas as condições forem atendidas.

## Critérios por fase
- Preservar projetos Supply, visitas e históricos; não conceder acesso por associação à equipe.
- CDE aplicado imediatamente aos novos controles.
- Testes de cálculos/permissões e conferência autenticada de salvar/reabrir, computador e celular.
- Publicar apenas quando solicitado; informar claramente o que ainda depende de serviços externos.

## Detalhes técnicos
- Evolução aditiva nas tabelas pm_*; RLS e funções autorizadas para operações atômicas.
- Modelo de dependências tipado, DAG validado e algoritmo de restrições temporais/CPM com testes por tipo de vínculo.
- Separar dados de hierarquia, fluxo de trabalho e comunicação; snapshots versionados preservam baselines legadas.
- Entregas sequenciais: concluir e validar cada fase antes de iniciar a seguinte.
