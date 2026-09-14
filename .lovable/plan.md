# Opção de alocação Interna

## Objetivo
Adicionar a opção **Interna** à alocação de solicitações de **Materiais**, **Serviços** e **Viagens**, indicando despesas da própria myio sem vínculo com Projeto ou Cliente.

## Alterações
- Incluir o checkbox **Interna** ao lado das opções atuais de alocação nos três tipos de solicitação.
- Exibir abaixo das opções a frase: “Qualquer despesa interna não atrelada a clientes ou projetos”.
- Ao selecionar **Interna**, limpar e ocultar os campos Projeto e Cliente.
- Preservar o Centro de Custo e os demais campos e validações já existentes.
- Registrar explicitamente a alocação interna no pedido para diferenciá-la de dados incompletos, mantendo Projeto e Cliente vazios.
- Ajustar os resumos e relatórios que exibem a alocação para mostrar **Interna**.

## Regras
- Materiais mantêm as opções **Projeto**, **Estoque** e passam a ter **Interna**.
- Serviços e Viagens mantêm **Projeto** e **Cliente** e passam a ter **Interna**.
- A opção afeta apenas novas solicitações; pedidos existentes permanecem inalterados.

## Validação
- Conferir os três tipos na tela de Novas Solicitações.
- Validar que Projeto e Cliente não aparecem nem são exigidos na opção Interna.
- Confirmar que o pedido é salvo e identificado como Interna no acompanhamento.
