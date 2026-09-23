# Pré-cadastro de LUCs por Excel

## Objetivo
Permitir que a equipe de suporte prepare uma OS de shopping antes da visita, importando uma planilha com as colunas **LUC** e **Nome da loja**. Cada linha válida será criada como um ambiente da mesma OS.

## O que será feito
- Adicionar à OS de shopping uma lista própria de ambientes/LUCs, sem limitar a OS a uma única loja.
- Incluir o botão **Importar Excel** na identificação da OS para usuários com permissão de criar/agendar.
- Ler arquivos `.xlsx`, `.xls` e `.csv` com as colunas `LUC` e `Nome da loja`.
- Exibir uma conferência antes da gravação, indicando linhas válidas, incompletas e duplicadas.
- Permitir corrigir nomes sugeridos pela IA da fachada durante a visita, preservando o histórico de alterações de cada LUC.
- Manter inclusão e edição manual para ajustes pontuais.
- Incluir os novos registros no backup do sistema.

## Regras
- Uma importação alimenta apenas uma OS de shopping já selecionada.
- `LUC` e `Nome da loja` são obrigatórios em cada linha.
- O mesmo número de LUC não pode aparecer duas vezes na mesma OS.
- Uma nova importação atualiza o nome de um LUC existente e adiciona os novos, sem apagar ambientes ausentes da planilha.
- Toda alteração registra autor, data/hora, nome anterior e nome novo.
- O recurso usa as permissões existentes de criação/agendamento e edição do Site Survey; não cria alçadas ou aprovação.

## Validação
- Testar importação válida, linhas incompletas, duplicidades e atualização de nomes.
- Conferir a visualização e edição da lista em computador e celular.
- Confirmar que a OS e o histórico permanecem íntegros após nova importação.
