# Cadastro dos tipos de estoque

## Objetivo
Transformar a lista atual usada ao cadastrar um item novo em **Materiais** em um cadastro configurável dentro de **Cadastro > Diversos**.

## Implementação
- Criar em **Diversos** o bloco **Tipos de Estoque**, no mesmo padrão dos demais: expandir/recolher, criar, editar, ordenar, ativar/desativar e excluir com confirmação.
- Cadastrar inicialmente as quatro opções atuais:
  - Estoque Fábrica (Insumos de Fabricação)
  - Estoque Myio (Insumos de Instalação)
  - Estoque Almoxarifado
  - Ferramentas e Ativos
- Substituir a lista fixa do formulário de **Materiais** pela lista ativa e ordenada do novo cadastro.
- Preservar os códigos internos das quatro opções atuais para manter o direcionamento correto de cada item ao seu respectivo estoque.
- Bloquear a exclusão das quatro categorias estruturais, pois elas determinam em qual área e tabela o item será criado; permitir editar o texto, a ordem e a disponibilidade.

## Segurança e validação
- Aplicar as mesmas permissões administrativas e proteção de dados dos demais cadastros em **Diversos**.
- Validar o formulário em computador e celular e confirmar que cada opção continua criando o item no estoque correto.
