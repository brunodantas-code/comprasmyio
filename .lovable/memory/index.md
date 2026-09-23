# Project Memory

## Core
Comunicação sempre em pt-BR.
Plataforma externa de QR codes (produto.myio.com.br) é a fonte da verdade para LOCALIZAÇÃO, mas só para QRs gerados na homologação.
Projeto só vira Cliente após estar implantado e com contrato assinado; a API externa usa o nome do projeto no campo nome_cliente.
Estoque Fábrica, Estoque Myio Terceiros e Ferramentas/Ativos são áreas diferentes e nunca devem ser misturadas.
Compra só de item cadastrado (Fábrica/Almoxarifado/Terceiros/Ferramentas), sem texto livre; produtos fabricados Myio (is_manufactured) nunca são compráveis.
Status operacional de approval aprovado só pode ser alterado pelo Time de Supply ou Admin; solicitante apenas acompanha e confirma recebimento.
Botões de ação sempre com fundo verde e ícones/textos pretos; lilás somente em títulos explicitamente solicitados.

## Memories
- [Função operacional adicional](features/additional-operational-function.md) — Cargo define alçadas; função adicional Time de Supply libera fila e ações sem alterar a hierarquia
- [Regra de sync de QR externos](mem://features/external-qr-sync) — Só sincroniza QRs da homologation_units; externos desconhecidos são ignorados/removidos
- [Desconto único de estoque por QR](mem://features/stock-single-deduction) — QR homologado desconta estoque 1x só; mudança de setor é rastreio, nunca nova saída; estoque nunca negativo
- [Caixa é mestra do rastreio](mem://features/box-tracking-propagation) — Status/local da caixa propaga para todos os produtos internos (sync e push); produto instalado no cliente sai da caixa automaticamente; QR da caixa nunca vai à plataforma externa como código próprio
- [Projeto = Cliente](mem://features/project-equals-client) — nome_cliente da API externa é o nome do projeto; match por projects.name; unit_products.client_name = nome do projeto
- [Separação dos estoques](mem://features/stock-sections) — Estoque Fábrica e Estoque Myio Terceiros têm classificações e fluxos independentes
- [Compra só de itens cadastrados](mem://features/purchase-registered-items-only) — Pedido exige item comprável de Fábrica/Almoxarifado/Terceiros/Ferramentas; fabricados Myio excluídos; entrada automática no estoque de origem; Escritório não é comprável
- [Fila de compras separada](mem://features/buyer-queue-split) — Duas seções: Nacionais e Importados (purchase_type='importacao'); sem vínculo/tipo cai em Nacionais
- [Recuperação de avariado carrega o QR](mem://features/damaged-recovery-qr) — Recuperar item da plataforma externa vincula o QR à movimentação de destino e empurra o novo local para a API; sem isso o sync desfaz a recuperação
- [Estoque Ferramentas/Ativos](mem://features/tools-assets-stock) — Sub-aba ao lado de Almoxarifado com banco próprio; baixa exige destino (técnico ou local); disponível na solicitação de compras
- [Conversão de projeto em cliente](mem://features/project-client-conversion) — Projeto só vira Cliente após implantação e contrato assinado; Novo Projeto não escolhe Cliente
- [Cores dos botões de ação](mem://design/action-button-colors) — Fundo verde com ícones/textos pretos; lilás reservado a títulos solicitados
- [Conversas nos tickets do Code](mem://features/code-ticket-conversations) — Admin pergunta, Solicitante responde, histórico imutável e pendência direcionada a quem deve agir

- [Categorias de clientes](mem://features/client-categories) — Cadastro administrável com Shoppings e Lojas e classificação inicial automática
- [Campos da nova visita](design/site-survey-form-fields.md) — Na nova visita, somente campos com lista suspensa usam fundo verde-claro; demais campos ficam brancos
