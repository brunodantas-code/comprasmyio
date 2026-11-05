# Entrega ou Retirada nas Novas Solicitações

## O que muda para o usuário
- Acima do campo "Ponto de entrega" aparece uma escolha: **Entrega** (padrão) ou **Retirada**.
- Com **Retirada**, aparecem os mesmos campos de hoje, com nomes adaptados:
  - "Ponto de retirada" (mesma lista de pontos cadastrados e "Outro endereço").
  - Endereço com sugestões do Google, Rua e número, Complemento, UF e Cidade.
  - "Referência para retirada" (ex.: falar com João na recepção).
- O destinatário e a data limite continuam iguais nas duas opções.
- Na tela e no PDF do pedido, o endereço aparece como "Endereço de entrega" ou "Endereço de retirada", conforme a escolha.
- Pedidos antigos ficam como **Entrega**.

## Alterar depois do envio
- Na edição do pedido (solicitante e Compras, com as permissões que já existem), dá para trocar entre Entrega e Retirada e também ajustar o endereço.
- Toda troca fica registrada no **Histórico** do pedido, com quem trocou, data e hora, e "De Entrega para Retirada" (ou o contrário), além do endereço anterior e do novo.
- Quando Compras faz a alteração, ela segue a regra que já existe: motivo obrigatório e aviso ao solicitante.

## Detalhes técnicos
- O pedido ganha um novo campo, "modalidade" (`entrega` | `retirada`), que começa como `entrega`. Os pedidos existentes recebem esse valor automaticamente.
- O registro automático de alterações do pedido passa a incluir a troca de modalidade, com rótulo legível no Histórico.
- A edição de Compras pelo banco de dados passa a aceitar esse campo, que fica bloqueado depois da compra, como o endereço de entrega.
- Validação: a modalidade é obrigatória nos mesmos tipos de solicitação que hoje pedem o endereço.
