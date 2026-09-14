# Controle visual de orçamento por projeto

## Objetivo
Mostrar o consumo do orçamento ao selecionar um projeto, alertar sem bloquear quando uma nova solicitação ultrapassar o saldo e sinalizar esse risco para quem aprova.

## Implementação

### 1. Cálculo seguro no banco
- Criar campos na solicitação para registrar se ela ultrapassou o orçamento e os valores de orçamento/comprometido considerados no momento do envio.
- Criar uma função de leitura do resumo orçamentário por projeto, somando as solicitações de todos os usuários e desconsiderando solicitações canceladas.
- Calcular o flag automaticamente no banco ao inserir ou alterar uma solicitação vinculada a projeto, evitando divergências entre usuários simultâneos.
- Manter as permissões atuais: usuários autenticados verão somente o resumo agregado, sem exposição de dados de outras solicitações.

### 2. Nova Solicitação
- Ao selecionar um projeto com orçamento cadastrado, exibir uma barra de progresso com:
  - orçamento total;
  - valor já solicitado;
  - saldo disponível;
  - percentual comprometido.
- Atualizar a projeção conforme o usuário informa valor e quantidade.
- Quando a nova solicitação superar o saldo, exibir um aviso claro antes do envio.
- Permitir salvar normalmente; após salvar, confirmar que a solicitação foi criada com alerta de orçamento excedido.

### 3. Sinalização para aprovação
- Exibir um indicador visual “Orçamento excedido” nas listas de Approvals, inclusive em “Pendentes comigo”.
- Mostrar no detalhe do Approval o orçamento e o total projetado registrados quando a solicitação foi criada.
- Preservar o fluxo normal de aprovação: o indicador informa o risco, mas não bloqueia a decisão.

### 4. Cadastro > Projetos
- Remover a coluna “Descrição”.
- Tornar o nome do projeto clicável e também sensível ao cursor para mostrar a descrição completa.
- Adicionar as colunas “Solicitado” e “% do orçamento”.
- Usar uma barra compacta na porcentagem, destacando visualmente projetos acima de 100%.
- Manter a tabela utilizável em telas menores.

### 5. Validação
- Validar o projeto de exemplo “Teste de orçamento” com seu orçamento e solicitações existentes.
- Testar um pedido dentro do saldo e outro acima do saldo, confirmando que ambos são salvos e somente o segundo recebe o indicador.
- Conferir as telas de Nova Solicitação, Projetos, Pendentes comigo e Todos em desktop e celular.
- Verificar compilação, erros de execução e ausência de rolagem lateral indevida.

## Regra adotada
“Solicitado/comprometido” será a soma de todas as solicitações vinculadas ao projeto, de todos os usuários, exceto as canceladas. Solicitações pendentes entram no comprometido porque já reservam orçamento potencial.
