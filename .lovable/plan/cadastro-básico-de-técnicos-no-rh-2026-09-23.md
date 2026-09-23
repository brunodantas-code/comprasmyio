# Cadastro básico de técnicos no RH

## Objetivo
Criar no aplicativo RH uma ficha básica para cada técnico já cadastrado no Supply e usar o celular dessa ficha automaticamente no Site Survey.

## Implementação
- Adicionar o campo **Celular** ao cadastro central de usuários, mantendo nome, e-mail e cargo já existentes como fonte dos dados básicos.
- Atualizar a lista de técnicos do Site Survey para também retornar o celular cadastrado no RH.
- Substituir o preenchimento manual do celular no checklist pelo número consultado automaticamente; quando ainda não houver número, indicar que o cadastro precisa ser completado no RH.
- Transformar a tela do RH em uma lista compacta dos técnicos do Supply, com busca, ficha recolhível e edição do celular com máscara `(DDD) 9XXXX-XXXX`.
- Aplicar acesso somente a usuários já liberados para o aplicativo RH e preservar os controles atuais de acesso do ERP.
- Atualizar os tipos do aplicativo e validar o fluxo em computador e celular.

## Dados existentes
- Os técnicos continuarão sendo identificados pelo cadastro e cargo já usados no Supply; não haverá duplicação de usuários.
- Os técnicos já existentes aparecerão automaticamente no RH, mesmo com celular inicialmente vazio.
