# Perguntas condicionais e geração de chamados

## O que será alterado
- Ao abrir “Nova pergunta”, exibir o formulário no topo da lista; depois de salvar, a pergunta entra no final da seção e mantém a ordenação por arraste.
- Adicionar a opção “Condicionada”, permitindo escolher uma pergunta anterior e a resposta que torna a nova pergunta visível.
- Ocultar perguntas cuja condição não foi atendida e desconsiderá-las dos indicadores de pendência, validação e conclusão.
- Adicionar a opção “Gerar ação”, permitindo escolher uma resposta disparadora e uma ação cadastrada.
- Criar em Cadastro uma lista administrável de ações, iniciada com “Chamado para o suporte” e “Solicitar intervenção do cliente”.
- Registrar o chamado imediatamente quando a resposta configurada for selecionada, vinculado à visita, pergunta, resposta e loja/ambiente quando aplicável.
- Evitar chamados duplicados para a mesma resposta e cancelar a ocorrência ainda aberta quando a resposta deixar de atender à regra.

## Limite desta etapa
- Os chamados ficarão estruturados e registrados para o futuro aplicativo **Chamados**.
- A tela própria do aplicativo Chamados, seus responsáveis, prioridades e fluxo de atendimento serão definidos posteriormente.

## Detalhes técnicos
- Criar catálogo de ações, regras de disparo por pergunta/resposta e ocorrências geradas, com acesso protegido e histórico.
- Preservar as configurações existentes de fotos, detalhes, clima e regras atuais do checklist.
- Permitir condições somente com perguntas anteriores da mesma seção, evitando dependências circulares.

## Validação
- Testar criação, edição, posicionamento inicial e ordenação final da pergunta.
- Testar exibição condicional, pendências e bloqueio de conclusão.
- Testar geração imediata, prevenção de duplicidade e cancelamento após mudança de resposta.
- Conferir Cadastro e checklist em computador e celular.
