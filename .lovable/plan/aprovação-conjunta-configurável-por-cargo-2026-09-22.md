# Aprovação conjunta configurável por cargo

## Resultado esperado
- Manter a aprovação conjunta ativável e o valor-limite configurável pelo Admin.
- Adicionar dois seletores de cargo, inicialmente preenchidos com Diretor Financeiro (CFO) e Presidente (CEO).
- Acima do valor definido, exigir a participação dos dois cargos, sem repetir quem já participa da cadeia normal.

## Regra de funcionamento
- Se um dos aprovadores configurados já estiver na cadeia normal, somente o outro receberá a etapa conjunta adicional.
- Se nenhum estiver na cadeia, os dois receberão etapas paralelas, disponíveis ao mesmo tempo.
- Se ambos já estiverem na cadeia, nenhuma etapa repetida será criada.
- O Approval somente será concluído quando todas as etapas exigidas forem aprovadas; uma rejeição encerra o fluxo.
- Solicitações monetárias acima do limite nunca serão aprovadas automaticamente por alçada pessoal.

## Interface
- Trocar o título fixo “CFO + CEO” por “Aprovação conjunta”.
- Exibir, no mesmo bloco, os seletores “Cargo 1” e “Cargo 2”, apenas com cargos ativos e sem permitir o mesmo cargo nos dois campos.
- Informar claramente o limite vigente e os dois cargos responsáveis.

## Detalhes técnicos
- Acrescentar à configuração os dois cargos da aprovação conjunta, com referências aos cargos cadastrados e preenchimento inicial por `short_name` CFO e CEO.
- Atualizar a montagem da cadeia para resolver os ocupantes pelos vínculos de cargo principal ou adicional, sem depender do nome exibido do cargo.
- Deduplicar pelo usuário já incluído na cadeia e criar as etapas ausentes no mesmo nível, preservando a ordem normal anterior.
- Validar configuração incompleta, cargos iguais ou cargos sem ocupante ativo antes de aceitar novos Approvals acima do limite.
- Preservar a regra por quantidade dos Dispositivos myio, que não utiliza valor monetário.

## Validação
- Testar os quatro cenários: nenhum, primeiro, segundo ou ambos já presentes na cadeia normal.
- Confirmar que os dois cargos veem etapas simultâneas quando ambos forem necessários.
- Confirmar que somente o cargo ausente recebe etapa adicional quando o outro já estiver na cadeia.
- Validar a tela de configuração em computador e celular e mostrar a prévia antes de concluir.
