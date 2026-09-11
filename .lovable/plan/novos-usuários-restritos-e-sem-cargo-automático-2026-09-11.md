# Novos usuários restritos e sem cargo automático

## Objetivo
Garantir que toda nova conta entre com **Perfil de acesso Restrito**, sem cargo automático, aguardando um Admin definir os menus permitidos e o cargo correto.

## Implementação
1. Alterar o cadastro automático para criar novos usuários com perfil **Restrito** e sem o antigo cargo **Solicitante**.
2. Remover **Solicitante** das opções de Cargo e dos textos da tela de cadastro.
3. Identificar usuários restritos ainda sem menus configurados como **Configuração pendente** na tela de Usuários e na área de Perfis de Acesso.
4. Remover dos usuários atuais a associação legada ao cargo Solicitante, preservando qualquer outro cargo já atribuído.
5. Atualizar o usuário de teste “Leonardo Roedel” para Restrito e sem cargo automático.
6. Validar cadastro, permissões iniciais e telas administrativas em desktop e celular.

## Detalhes técnicos
- Atualizar a função de criação de usuário e o padrão de `user_access_profiles` para `restrito`.
- Manter o valor legado do enum interno por compatibilidade histórica, mas impedir novas atribuições e remover as associações atuais; isso evita uma alteração destrutiva que poderia afetar históricos.
- Um usuário Restrito sem permissões marcadas não terá acesso aos menus operacionais até a configuração por um Admin.
- Preservar a exceção técnica do primeiro usuário de uma instalação vazia, que precisa iniciar como Admin para permitir a configuração do sistema.
