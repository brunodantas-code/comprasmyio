# Converter cliente existente em unidade

## Objetivo
Permitir que, ao editar um cliente, ele seja vinculado a outro cliente corporativo e passe a ser uma filial ou unidade.

## Comportamento
- Adicionar ao formulário **Editar cliente** o campo opcional **Cliente corporativo**.
- Listar todos os outros clientes como possíveis matrizes, sem permitir vínculo consigo mesmo.
- Ao salvar com uma matriz selecionada, pedir confirmação antes da conversão.
- Criar a unidade na matriz usando nome fantasia e CNPJ do cliente convertido.
- Transferir automaticamente projetos, solicitações, pedidos de estoque e lançamentos financeiros para a matriz.
- Nos registros que aceitam unidade, manter uma unidade já selecionada ou usar a nova unidade convertida.
- Transferir também eventuais unidades já existentes do cliente convertido para a matriz.
- Remover o cadastro corporativo antigo após a transferência, sem apagar o histórico.
- Atualizar imediatamente as listas e seletores de clientes e unidades.

## Segurança e consistência
- Executar toda a conversão em uma única operação no banco, evitando transferência parcial.
- Restringir a operação aos administradores de acesso.
- Bloquear nomes de unidade duplicados na mesma matriz e impedir conversões inválidas.

## Validação
- Testar a edição sem conversão e a conversão para uma matriz.
- Confirmar que o cliente deixa a lista principal e aparece expandido como unidade da matriz.
- Confirmar que projetos e solicitações continuam exibindo a matriz e a unidade corretas.
- Verificar a versão para computador e celular e confirmar que não há erros.

## Ajuste adicional dos cabeçalhos
- Substituir o botão textual **Plataforma ERP** pelo mesmo botão compacto de **Início** já usado no portal.
- Aplicar o botão em Supply, Cash Flow, Code, CRM, Legal, RH e Central de Pendências, mantendo o retorno à página inicial dos aplicativos.
