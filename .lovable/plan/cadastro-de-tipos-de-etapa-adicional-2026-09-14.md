# Cadastro de Tipos de Etapa Adicional

## Objetivo
Transformar os tipos hoje fixos em um cadastro gerenciável dentro de **Cadastro > Diversos**. As opções cadastradas serão usadas automaticamente no campo **Tipo** de **Approval Workflow > Etapas Adicionais**.

## Alterações na tela
- Em **Cadastro > Diversos**, incluir a seção **Tipos de Etapa Adicional**.
- Permitir criar, editar, ativar/desativar e excluir tipos que ainda não estejam vinculados a etapas.
- Manter inicialmente os tipos já existentes: Validação Técnica, Validação Comercial, Validação Orçamentária e Compliance.
- Impedir nomes duplicados, desconsiderando maiúsculas, minúsculas e espaços nas extremidades.
- Em **Etapas Adicionais**, carregar o campo **Tipo** a partir desse cadastro, removendo a lista fixa do código.
- Exibir somente tipos ativos na criação; ao editar, preservar a visualização do tipo já vinculado mesmo que ele tenha sido desativado.
- Atualizar a lista de tipos imediatamente após qualquer alteração no cadastro.

## Regras no banco de dados
- Criar uma tabela própria para os Tipos de Etapa Adicional, com nome, status e datas de criação/atualização.
- Aplicar permissões e proteção de acesso equivalentes às configurações administrativas existentes.
- Vincular cada Etapa Adicional ao tipo cadastrado por uma referência segura.
- Migrar os valores atuais para os quatro registros iniciais sem perder etapas já configuradas.
- Bloquear a exclusão de um tipo que esteja em uso e orientar o usuário a desativá-lo ou realocar as etapas.

## Validação
- Testar criação, edição, ativação, desativação e exclusão de tipos.
- Confirmar que tipos ativos aparecem no dropdown e tipos desativados não aparecem em novas etapas.
- Confirmar que etapas existentes mantêm seus tipos após a migração.
- Verificar as telas em computador e celular, além da compilação e execução da aplicação.

## Detalhes técnicos
A tabela de tipos terá chave própria, nome único normalizado e políticas administrativas. `approval_rules` receberá uma referência para essa tabela; os dados atuais de `step_type` serão migrados antes de a interface passar a usar a relação.
