# Realocação ampliada na exclusão

## Resultado esperado
- Ao excluir um projeto ou cliente, cada vínculo listado poderá ser transferido para outro projeto, cliente corporativo ou unidade/filial.
- Ao excluir um cliente, projetos associados serão movidos integralmente para o cliente ou unidade escolhido, mantendo suas solicitações no projeto.
- O destino exibirá claramente sua categoria: Projeto, Cliente ou Unidade/Filial.

## Alterações
1. Ampliar a janela de exclusão para apresentar todos os tipos de destino em uma única seleção agrupada.
2. Incluir clientes e unidades/filiais como destinos na exclusão de projetos, e projetos e unidades/filiais como destinos na exclusão de clientes.
3. Centralizar a realocação em operações transacionais no banco, atualizando os campos de projeto, cliente, unidade e tipo de alocação de forma coerente.
4. Preservar vínculos derivados: pedidos de dispositivos e contas a pagar relacionados à solicitação acompanharão a nova alocação.
5. Manter a exclusão bloqueada até todos os vínculos serem realocados e atualizar as listas após cada operação.
6. Validar os dois fluxos na interface e conferir que exclusão, realocação e totais continuam funcionando.

## Regras técnicas
- Somente administradores continuam autorizados a consultar e executar realocações.
- Uma unidade/filial sempre carrega também o cliente corporativo correspondente.
- Destino Projeto define alocação como Projeto; destino Cliente ou Unidade/Filial define alocação como Cliente.
- Não será permitida realocação para a própria origem nem para unidade pertencente ao cliente que está sendo excluído.
- A operação será atômica para evitar registros parcialmente realocados.
