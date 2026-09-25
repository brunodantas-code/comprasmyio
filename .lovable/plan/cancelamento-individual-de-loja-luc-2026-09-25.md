# Cancelamento individual de Loja/LUC

## Objetivo
Adicionar ao preenchimento da visita um botão **Cancelar visita** ao lado de **Concluir visita**, aplicável somente à Loja/LUC selecionada.

## Comportamento
- Ao clicar em **Cancelar visita**, abrir uma confirmação solicitando obrigatoriamente o motivo.
- Disponibilizar inicialmente:
  - Impossibilidade de acesso
  - Por solicitação do cliente
  - Alteração de local
  - Fim da operação
- Após confirmar, marcar somente a Loja/LUC selecionada como **Cancelada**.
- Preservar respostas, fotos, anexos e histórico já registrados nessa loja.
- Mostrar **Cancelada** no seletor e no indicador da loja.
- Uma loja cancelada contará como encerrada e não bloqueará a conclusão da visita geral.
- Impedir novo preenchimento ou conclusão da loja enquanto estiver cancelada.

## Cadastro
- Criar em **Cadastro > Diversos** a lista **Motivos de cancelamento de Loja/LUC**.
- Permitir adicionar e excluir motivos pelo mesmo padrão dos demais cadastros.
- Os quatro motivos iniciais serão cadastrados automaticamente.

## Dados e histórico
- Ampliar o registro da Loja/LUC com status cancelado, motivo, data/hora e usuário responsável.
- Registrar a mudança no histórico existente da Loja/LUC.
- Manter compatibilidade com lojas pendentes e concluídas já existentes.

## Validação
- Conferir o fluxo completo no computador e no celular.
- Validar seleção obrigatória do motivo, confirmação, status no seletor e conclusão geral com lojas concluídas ou canceladas.
