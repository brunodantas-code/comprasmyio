# Cadastros genéricos em Diversos

## Objetivo
Padronizar os cadastros de **Cadastro > Diversos** para que cada seção tenha sua própria lista e um botão **“+”** para incluir novos registros, sem manter o formulário de criação aberto permanentemente.

## Alterações na tela
- Exibir separadamente **Tipos de Etapa Adicional** e **Tipos de Solicitação**, com o mesmo padrão visual.
- Em cada cadastro, mostrar título, descrição, lista, status e ações.
- Adicionar um botão **“+”** no cabeçalho de cada seção; o formulário será aberto em uma janela.
- Manter edição, ativação e desativação dos registros existentes.
- Permitir criar novos Tipos de Etapa Adicional pelo botão “+”.
- Permitir criar novos Tipos de Solicitação pelo botão “+”, informando nome e escolhendo um modelo de formulário existente.

## Tipos de Solicitação por modelo
- Cada novo tipo terá código próprio, nome, status, ordem e um **modelo** escolhido entre os formulários existentes: Materiais, Serviços, Viagens, Reembolsos, Pagamento, Contratação de RH, Importação ou Dispositivos.
- O novo tipo aparecerá em **Novas Solicitações** quando estiver ativo e respeitará as mesmas permissões do modelo escolhido.
- Ao selecionar o novo tipo, a tela e as regras usarão o formulário do modelo escolhido, mas a solicitação guardará o código e o nome do novo tipo para identificação e histórico.
- Regras especiais de pagamento, estoque, viagens, RH, importação e dispositivos continuarão vinculadas ao modelo, evitando quebra dos fluxos existentes.
- Tipos de Solicitação poderão ser desativados; a exclusão será bloqueada quando houver uso em solicitações ou Etapas Adicionais.

## Banco de dados e segurança
- Ampliar o cadastro de Tipos de Solicitação com o campo de modelo e permitir inclusão administrativa.
- Manter os oito tipos atuais como seus próprios modelos.
- Validar código e nome únicos, com permissões equivalentes aos demais cadastros administrativos.
- Atualizar a montagem da cadeia de aprovação para considerar o modelo quando necessário, sem alterar históricos.

## Validação
- Criar, editar e desativar um Tipo de Etapa Adicional pelo novo padrão.
- Criar um Tipo de Solicitação escolhendo um modelo e confirmar sua aparição em Novas Solicitações.
- Confirmar que o novo tipo abre o formulário correto e mantém seu próprio nome nas listas e Approvals.
- Confirmar que tipos inativos não aparecem em novas solicitações, mas continuam legíveis no histórico.
- Verificar computador, celular, compilação e execução da aplicação.
