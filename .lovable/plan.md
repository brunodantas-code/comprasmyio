# Cargos adicionais e retirada de Funções Operacionais

## Objetivo
Substituir “Função Operacional Adicional” por “Cargo adicional”, permitindo que um usuário acumule responsabilidades e acessos de outros cargos sem perder seu cargo principal.

## Alterações
- Remover a aba/menu “Funções Operacionais” do Cadastro de Cargos.
- Trocar no cadastro de usuários o campo “Função operacional adicional” por “Cargos adicionais”, com seleção de um ou mais cargos ativos.
- Criar o vínculo seguro entre usuário e cargos adicionais, com acesso restrito aos administradores.
- Somar ao usuário os acessos e capacidades funcionais reconhecidos pelos cargos adicionais.
- Manter o cargo principal como referência da cadeia quando o próprio usuário cria uma solicitação.
- Permitir que o usuário seja escolhido como aprovador em posições correspondentes a qualquer cargo adicional, sem duplicar etapas quando ele já estiver na cadeia.
- Manter a equipe de Supply reconhecida pelo cargo “Analista de Supply”, sem depender da estrutura antiga.
- Vincular Alexandre Ribeiro ao cargo adicional “Analista de Supply” e retirar seu vínculo operacional antigo.
- Preservar as tabelas antigas apenas como histórico descontinuado, sem exibi-las nem utilizá-las no sistema.

## Regras de segurança e consistência
- Somente Admin poderá atribuir ou retirar cargos adicionais.
- Um cargo não poderá ser simultaneamente o principal e adicional do mesmo usuário.
- Cargos inativos não poderão ser atribuídos.
- A composição não alterará o perfil de acesso individual nem a alçada financeira cadastrada para a pessoa.
- A cadeia de aprovação continuará determinística e impedirá etapas duplicadas para o mesmo aprovador.

## Validação
- Confirmar Alexandre com cargo principal atual e “Analista de Supply” como adicional.
- Confirmar acesso à fila e às ações de Supply.
- Validar um cenário CFO + COO: acessos somados, elegibilidade para aprovar como COO e cadeia própria iniciada pelo cargo principal CFO.
- Validar cadastro e edição em computador e celular.
- Verificar compilação, erros em execução e políticas de acesso.
