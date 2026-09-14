# Liberar endereço manual nas solicitações

## Objetivo
Garantir que uma solicitação possa ser salva mesmo quando a consulta ao Google Maps estiver indisponível.

## Alterações
- Aceitar como endereço válido qualquer texto manual com pelo menos 3 caracteres.
- Continuar exibindo sugestões e confirmação visual quando o Google Maps responder.
- Remover o bloqueio oculto que hoje exige selecionar uma sugestão.
- Informar claramente que, em caso de falha do Google, o endereço digitado será usado.
- Aplicar o mesmo comportamento ao criar e editar solicitações.

## Validação
- Testar endereço selecionado pelo Google.
- Testar endereço digitado manualmente com o Google indisponível.
- Confirmar que complemento e endereço chegam ao formulário e permitem salvar.
