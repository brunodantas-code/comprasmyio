# Cadastro de Tipos de Solicitação

## Objetivo
Adicionar em **Cadastro > Diversos** o gerenciamento dos tipos já existentes: Materiais, Serviços, Viagens, Reembolsos, Pagamento, Contratação de RH, Importação e Dispositivos.

Também tornar o número do Approval clicável em **Pendentes comigo**, abrindo os detalhes completos da solicitação, e substituir a coluna **Etapa** por **Projeto ou Cliente**.

## Alterações na tela
- Manter o cadastro de **Tipos de Etapa Adicional** e incluir, na mesma área de Diversos, uma seção própria para **Tipos de Solicitação**.
- Listar os oito tipos atuais com nome e status.
- Permitir editar o nome exibido e ativar/desativar cada tipo.
- Impedir nomes duplicados, desconsiderando maiúsculas, minúsculas e espaços nas extremidades.
- Usar os nomes cadastrados em seletores, listas e na configuração de Etapas Adicionais.
- Mostrar somente tipos ativos ao criar uma nova solicitação e ao configurar novos vínculos de etapas.
- Preservar o nome e o histórico das solicitações existentes, inclusive quando um tipo for desativado.
- Não permitir criar ou excluir tipos, pois cada tipo atual possui formulário e regras próprios.

### Pendentes comigo
- Transformar o número do Approval em um link, sem negrito.
- Ao clicar, abrir uma janela com todas as informações da solicitação, seus vínculos e dados de aprovação.
- Incluir nessa janela o gráfico de **Orçado x Solicitado** quando houver projeto vinculado.
- Substituir a coluna **Etapa** por **Projeto ou Cliente**, exibindo o vínculo aplicável; para solicitações internas ou de estoque, mostrar a respectiva identificação.
- Manter as ações de aprovar e rejeitar na tabela.

## Regras no banco de dados
- Criar uma tabela para os Tipos de Solicitação com código interno imutável, nome editável, status e datas de criação/atualização.
- Inserir os oito tipos atuais com seus códigos já usados pelo sistema.
- Aplicar permissões administrativas equivalentes aos demais cadastros de Diversos.
- Vincular com segurança os tipos usados nas solicitações e nas Etapas Adicionais, sem alterar os códigos existentes nem apagar histórico.
- Manter regras especiais de Pagamento, Viagens, RH, Importação e demais tipos associadas ao código interno, mesmo após renomear o texto exibido.

## Validação
- Testar edição, ativação, desativação e bloqueio de nomes duplicados.
- Confirmar que tipos desativados deixam de aparecer em novas solicitações e em novos vínculos de Etapas Adicionais.
- Confirmar que solicitações e etapas existentes continuam exibindo corretamente seus tipos.
- Confirmar que o link do Approval abre os dados corretos e que o gráfico usa os valores do projeto da solicitação.
- Confirmar a exibição correta de Projeto, Cliente, Interna ou Estoque na nova coluna.
- Verificar as telas em computador e celular, além da compilação e execução da aplicação.

## Detalhes técnicos
Os códigos internos atuais permanecerão imutáveis e continuarão comandando os formulários e regras específicas. A interface passará a resolver os nomes pelo novo cadastro, com fallback para os rótulos atuais durante carregamento ou em registros históricos. A consulta dos approvals será ampliada com os dados necessários de projeto, cliente, solicitação e orçamento para alimentar a janela de detalhes sem alterar o fluxo de decisão.
