# Cadastro de Motivos de Avaria

## Objetivo
Adicionar em **Cadastro > Diversos** uma lista administrável de Motivos de Avaria e usar os itens ativos no campo **Motivo da avaria**.

## Implementação
- Criar o cadastro com os três motivos atuais: **Água ou Líquidos**, **Falha** e **Quebra Física**.
- Exibir o novo bloco em Diversos seguindo o padrão existente: expandir/recolher, criar, editar, ativar/desativar e excluir.
- Exigir confirmação antes da exclusão; quando o motivo já estiver vinculado a uma avaria, solicitar a realocação desses registros para outro motivo ativo.
- Substituir a lista fixa da tela de registro de avaria pela lista ativa desse cadastro.
- Manter os registros históricos e aplicar permissões para que somente usuários autorizados a administrar cadastros possam alterar a lista.

## Validação
- Confirmar que os três motivos atuais aparecem inicialmente em Diversos e no seletor de avaria.
- Validar criação, edição, ativação, exclusão sem vínculo e exclusão com realocação.
- Conferir a aplicação em telas grande e pequena e garantir que a aplicação permaneça sem erros.

## Detalhes técnicos
- Nova tabela protegida para os motivos e vínculo pelo código interno no histórico de avarias.
- Ampliação do fluxo genérico de análise/realocação de vínculos usado pelos demais cadastros de Diversos.
- Consulta compartilhada com atualização automática da lista após alterações no cadastro.
