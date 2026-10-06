# Cadastro reutilizável de lojas e quiosques

## Objetivo
Consolidar no Cadastro os nomes de lojas e quiosques já usados nas visitas, sem duplicidades, e reutilizá-los ao adicionar pontos em novas visitas.

## Experiência
- Adicionar no Cadastro uma lista de **Lojas e quiosques**, separando visualmente cada tipo e exibindo somente um registro por nome equivalente.
- Preencher inicialmente essa lista com todas as lojas e quiosques já registrados nas visitas realizadas.
- Manter a lista atualizada automaticamente quando uma loja ou quiosque novo for salvo ou importado em qualquer visita.
- No formulário **Adicionar ambiente**, ao marcar **Loja** ou **Quiosque**, transformar o campo de nome em uma lista pesquisável e editável.
- Filtrar as sugestões pelo tipo selecionado e pelo texto digitado; selecionar uma sugestão preenche o nome, mas continua permitindo corrigir ou cadastrar um texto novo.
- Preservar LUC, localização, identificação pela fachada, confirmação de LUC repetido e todo o histórico atual das visitas.

## Regras de dados
- Considerar duplicados os nomes iguais após remover espaços extras, diferenças entre maiúsculas/minúsculas e acentos.
- Manter Loja e Quiosque como tipos separados, permitindo que o mesmo nome exista uma vez em cada tipo.
- O catálogo será apenas uma referência para preenchimento: cada visita continuará armazenando seu próprio nome, sem vínculo que altere registros históricos.
- Permitir incluir e editar nomes pelo Cadastro; alterações no catálogo não reescrevem visitas anteriores.

## Validação
- Conferir a carga dos nomes históricos sem duplicidades.
- Testar busca, seleção, edição livre e criação de novo nome para Loja e Quiosque.
- Confirmar que um nome novo salvo em uma visita aparece no Cadastro e nas visitas seguintes.
- Verificar o fluxo no computador e no celular, além da compilação e dos avisos da aplicação.

## Detalhes técnicos
- Criar uma tabela protegida para o catálogo, com chave única por tipo e nome normalizado, permissões compatíveis com o Site Survey e atualização automática a partir dos pontos das visitas.
- Incluir a lista na consulta principal do Site Survey e reutilizar os controles pesquisáveis já existentes no ERP.