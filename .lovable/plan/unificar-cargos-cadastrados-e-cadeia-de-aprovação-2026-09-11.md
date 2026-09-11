# Unificar cargos cadastrados e cadeia de aprovação

## Objetivo
Fazer com que a lista de Cargo dos usuários e o Organograma de Aprovação usem exatamente os cargos ativos cadastrados no menu **Cargos**.

## Implementação
1. Vincular cada usuário diretamente a um cargo cadastrado, mantendo apenas um cargo principal por usuário.
2. Fazer o campo **Cargo** da tela Usuários listar automaticamente todos os cargos ativos do Cadastro, incluindo Coordenador, Desenvolvedor, Engenheiro, Estagiário, Gerente e Técnico de Instalação.
3. Atualizar o Organograma de Aprovação para listar esses mesmos cargos e permitir escolher qual cargo aprova cada um.
4. Migrar as atribuições atuais (CEO, CFO, COO, CTO, Financeiro, Fábrica, Estoquista e Time de Supply) para os cargos cadastrados correspondentes, criando os cadastros ausentes sem duplicar os existentes.
5. Manter Admin exclusivamente como Perfil de acesso; ele não aparecerá como cargo comum.
6. Preservar as solicitações e etapas de aprovação já criadas, alterando somente novas cadeias geradas após a migração.

## Detalhes técnicos
- Criar vínculos por identificador entre usuários, cargos cadastrados e hierarquia, evitando depender de uma lista fixa no código.
- Manter a estrutura antiga apenas para compatibilidade dos históricos existentes, sem usá-la para novas atribuições.
- Atualizar a geração da cadeia para percorrer cargos cadastrados, pular cargos vazios e impedir ciclos.
- Impedir a exclusão de um cargo que esteja atribuído a usuários ou usado no organograma; ele poderá ser desativado após retirar os vínculos.
- Validar atribuição, edição da hierarquia e organograma em desktop e celular.
