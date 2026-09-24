# Notificações do OpDesk para Suporte ao Cliente

## Objetivo
Mostrar chamados ativos como pendências apenas para usuários com o cargo principal ou adicional “Analista de Suporte ao Cliente”.

## Implementação
- Liberar aos analistas a visualização e gestão dos chamados internos, mantendo as regras atuais para solicitantes, responsáveis e administradores.
- Incluir chamados ativos na contagem da Central de Pendências.
- Listar cada chamado pendente na Central, com acesso direto ao chamado.
- Exibir uma bolinha vermelha com a quantidade no ícone do OpDesk, no portal móvel e no computador.
- Atualizar automaticamente as contagens após mudanças de situação no OpDesk.

## Validação
- Confirmar que o chamado aberto atual gera contagem “1” para o Analista de Suporte ao Cliente cadastrado.
- Verificar Central de Pendências e card OpDesk em celular e computador.
- Confirmar compilação sem erros.

## Detalhes técnicos
- Considerar ativos os estados Aberto, Em atendimento e Aguardando.
- Reconhecer tanto o cargo principal quanto cargos adicionais.
- Preservar o acesso atual do solicitante, do responsável e do administrador.
