# Vincular projetos a clientes

## Implementação
- Adicionar ao formulário **Novo projeto** um campo para selecionar um cliente já cadastrado.
- Gravar no projeto o vínculo com o cliente selecionado, preservando também os dados exibidos atualmente.
- Mostrar o cliente vinculado junto ao projeto na listagem para facilitar a conferência.
- Manter disponíveis para novas solicitações somente projetos ativos; após a implantação, impedir novas alocações de custos ao projeto também na regra de dados.

## Detalhes técnicos
- Reutilizar o vínculo existente entre projetos e clientes, sem alterar as alçadas ou solicitações já registradas.
- Adicionar uma validação no banco para recusar novas solicitações vinculadas a projetos implantados ou cancelados.
- Validar criação, exibição do vínculo e bloqueio de novas alocações após implantação.
