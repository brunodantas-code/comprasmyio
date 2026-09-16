# Opção de modo escuro

## Objetivo
Permitir que cada usuário alterne entre o modo claro e o modo escuro após entrar na plataforma, mantendo sua escolha nos próximos acessos.

## Implementação
- Adicionar um controle de tema no cabeçalho da plataforma, ao lado das ações de pendências e saída.
- Exibir ícone de lua no modo claro e de sol no modo escuro, com identificação acessível ao passar o cursor.
- Aplicar o tema a todos os aplicativos usando as cores semânticas já existentes, sem alterar fluxos ou permissões.
- Salvar a preferência no navegador do usuário e, no primeiro acesso, respeitar a configuração de aparência do aparelho.
- Aplicar o tema antes da tela aparecer para evitar mudança brusca de cores durante o carregamento.

## Validação
- Conferir alternância e persistência no portal, Supply, Cash Flow e Code.
- Validar contraste e legibilidade em computador e celular.
