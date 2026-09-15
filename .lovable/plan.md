# Destinos de Estoque configuráveis

## Objetivo
Cadastrar em **Cadastro > Diversos** os destinos **myio, Cliente, Técnicos, Perdido e Avariado** e usar essa lista na seleção de destino mostrada no Estoque.

## Alterações
- Criar o cadastro **Destinos de Estoque**, já preenchido com as cinco opções solicitadas, mantendo código interno, nome, ordem e status ativo.
- Exibir o novo cadastro em **Cadastro > Diversos**, no mesmo padrão dos demais: lista, botão “+”, edição e ativação/desativação.
- Substituir as opções fixas da janela de movimentação pela lista ativa do cadastro, ordenada conforme definido em Diversos.
- Preservar as regras atuais de cada destino: retorno ao myio, envio ao cliente, técnico, perdido ou avariado.
- Ao escolher **Cliente**, solicitar o projeto/cliente de destino antes de confirmar a movimentação.

## Segurança e validação
- Permitir leitura dos destinos aos usuários autenticados e alteração somente aos administradores autorizados.
- Impedir códigos duplicados e manter os cinco registros iniciais na própria atualização do banco.
- Validar a lista em Diversos, a seleção na janela e os fluxos condicionais de Cliente, Técnicos e Avariado.
