# Consolidar o Organograma de Aprovação

## Objetivo
Unificar a configuração da hierarquia em uma única tela por cargo, mantendo a visualização gráfica ao final.

## Alterações
1. Remover a seção separada **Nível de aprovação por usuário**.
2. Na tabela **Organograma de Aprovação**, exibir as colunas **Cargo**, **N-1**, **N+1** e **Usuários no cargo**.
3. Permitir editar somente **N+1**, escolhendo o superior direto do cargo.
4. Calcular **N-1** automaticamente, mostrando todos os cargos subordinados diretamente ao cargo da linha.
5. Remover a coluna e o texto **Aprovado por (cargo)**.
6. Manter as relações atuais até que cada cargo seja alterado; opções ainda não definidas aparecerão como **Não definido**.
7. Manter a visualização gráfica abaixo da tabela, refletindo automaticamente as relações N-1/N+1.

## Regras preservadas
- A hierarquia continuará sendo definida por cargo, não por pessoa.
- Ciclos continuarão bloqueados.
- Cargos sem usuário continuarão sendo ignorados na montagem de novas cadeias.
- As solicitações e aprovações já existentes não serão alteradas.

## Validação
- Conferir a edição de N+1, o cálculo de N-1 e a atualização do gráfico.
- Verificar a tela em computador e celular, sem rolagem lateral indevida.
