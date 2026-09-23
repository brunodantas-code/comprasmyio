# Aplicativo Site Survey

- [ ] Checklist prévio à visita técnica — confirmar, com seleção única “Sim” ou “Não”, se o celular está com 100% de bateria.
- [ ] Checklist prévio à visita técnica — confirmar, com seleção única “Sim” ou “Não”, se o powerbank está com 100% de bateria.
- [ ] Checklist prévio à visita técnica — confirmar, com seleção única “Sim” ou “Não”, se a parafusadeira está com 100% de bateria; ao marcar “Não”, exigir o relato do problema e abrir automaticamente um ticket como pendência do suporte.
- [ ] Checklist prévio à visita técnica — exigir que a data e o local do Site Survey sejam informados previamente no agendamento. Confirmar, com seleção única “Sim” ou “Não”, se haverá visita em áreas externas, como telhados ou acessos por escada externa; ao marcar “Sim”, consultar automaticamente uma fonte meteorológica pela data e endereço da OS. Qualquer possibilidade de chuva deve preencher “Existe previsão de chuva?” como “Sim”; sem possibilidade, preencher “Não”. Registrar fonte, data e hora da consulta e anexar uma imagem padronizada da previsão à OS e ao relatório. Para visitas fora da janela disponível de previsão, executar a consulta automaticamente assim que a data entrar nessa janela.
- [ ] Checklist da OS — Hidrômetro: seleção única “Fácil”, “Regular” ou “Difícil”; ao marcar “Difícil”, exigir detalhamento e foto.
- [ ] Checklist da OS — Localização do hidrômetro: seleção única entre “Loja”, “Sobreloja”, “Parede” e “Debaixo da pia”, com foto obrigatória.
- [ ] Checklist da OS — Ponto elétrico próximo: seleção única “Sim” ou “Não”; ao marcar “Sim”, exigir uma única opção entre “Luminária de emergência”, “Tomada”, “Teto”, “Parede” e “Quadro elétrico próximo”, além de foto obrigatória.
- [ ] Checklist da OS — Encaminhamento elétrico até o hidrômetro: seleção única entre “Instalar canaleta” e “Via instalação existente”, sempre com foto obrigatória.
- [ ] Checklist da OS — Tipo de registro existente: seleção única entre “Esfera”, “Gaveta”, “Pressão” e “Agulha”, sempre com foto obrigatória.
- [ ] Checklist da OS — Condição do registro: seleção única entre “Funcional” e “Inoperante”.
- [ ] Checklist da OS — Sentido do fluxo de água: seleção única entre “Antes do registro (correto)” e “Depois do registro (incorreto)”; ao marcar a opção incorreta, exigir “Solicitar intervenção do cliente” e foto.
- [ ] Checklist da OS — Vazão nominal do hidrômetro: seleção única em lista pré-cadastrada, incluindo inicialmente “3,5 m³/h” e “5 m³/h”, com opção “Outros”; administrar as vazões em Cadastro > Diversos e exigir foto em qualquer seleção.
- [ ] Checklist da OS — Tipo de flange: seleção única entre “Integrado (corpo do hidrômetro)”, “Soldável” e “Roscável”, sempre com foto obrigatória.
- [ ] Checklist da OS — Diâmetro da tubulação de água: seleção única em lista pré-cadastrada, incluindo inicialmente “20 mm — 1/2 pol.”, “25 mm — 3/4 pol.”, “32 mm — 1 pol.”, “50 mm — 1 1/2 pol.” e “60 mm — 2 pol.”, com opção “Outros”; administrar os diâmetros em Cadastro > Diversos e permitir foto opcional.
- [ ] Checklist da OS — Saída pulsada do hidrômetro: seleção única “Sim” ou “Não”; ao marcar “Sim”, exigir uma única condição entre “Funcional” e “Inoperante”.
- [x] Site Survey — criar Cadastro > Diversos com materiais, equipamentos, tipos de chave de fenda e bitolas de chave de grifo administráveis.
- [x] Checklist da OS — permitir selecionar vários materiais/equipamentos cadastrados, informando quantidade e observação em cada item.

- [x] Em Shopping, analisar foto da fachada com IA e sugerir um nome editável, preservando a confirmação do usuário.

- [x] Exibir Perfis de acesso do Site Survey em tela aberta no padrão visual do Supply, sem popup.

- [x] Preservar o histórico de nomes de lojas por LUC sempre que o ocupante for alterado.

- [x] Na abertura e edição da OS, manter LUC e nome da loja em campos separados para Shopping; para demais categorias, permitir ambientes repetíveis e editáveis com botão “+”.

- [x] Adicionar Site Survey ao portal com ícone de lupa e ao controle de acesso por aplicativo.
- [x] Reutilizar Perfis de acesso do Supply para menus e telas do Site Survey, sem alçadas nem Approval Workflow.
- [x] Criar agenda e ciclo Agendada → Em andamento → Em revisão → Concluída, com cancelamento e reabertura.
- [x] Vincular visitas a cliente e/ou projeto e técnico responsável.
- [x] Criar modelos configuráveis de checklist, respostas, fotos, anexos e histórico.
- [x] Incluir dados do Site Survey no backup e o aplicativo Site Survey na lista de melhorias e bugs do Code.
- [x] Validar permissões e fluxos em computador e celular e mostrar prévia antes de concluir.

# Correções dos alertas de monitoramento

- [x] Restaurar Destinatário e Prazo no pedido consolidado de Materiais.
- [x] Permitir endereço de entrega manual sem restaurar automaticamente o ponto padrão.
- [x] Incluir itens de Almoxarifado Geral no seletor de materiais.
- [x] Reativar cargos excluídos quando o mesmo nome for cadastrado novamente.
- [x] Incluir Ferramentas/Ativos e suas movimentações no backup.
- [x] Remover permissões derivadas automaticamente ao excluir um Tipo de Solicitação.
- [x] Corrigir os padrões das novas alçadas para R$ 3.000 e R$ 10.000.
- [x] Validar visualmente os fluxos corrigidos em computador e celular.

# Roadmap

## Tarefas
- [x] Posicionar os botões de editar e excluir abaixo do número do Approval e diferenciar as duas edições
- [x] Exibir a abreviação do cargo na sequência das alçadas, como CEO, em vez do nome completo
- [x] Encerrar a sequência no primeiro C-Level e não classificá-lo como Gestor da Área
- [x] Permitir classificar a categoria diretamente em cada material cadastrado no menu Materiais
- [x] Permitir realocar vínculos ao excluir Projetos ou Clientes para outro Projeto, Cliente ou Unidade/Filial
- [x] Vincular Materiais a categorias configuráveis e incluir Categorias de Materiais em Cadastro > Diversos
- [x] Adicionar o botão “+” e o cadastro de Materiais em Cadastro > Diversos
- [x] Identificar como Cliente ou Projeto a coluna Alocação em todos os submenus
- [x] Alinhar “Total geral” pela mesma linha de base dos indicadores de clientes e unidades
- [x] Corrigir totalizadores do relatório para não somar o cliente corporativo quando ele possui unidades ou filiais ativas
- [x] Aplicar a todos os ícones de ação o padrão 24×24 px, fundo verde-claro, borda preta e verde-escuro ao passar o cursor
- [x] Reorganizar Projetos no padrão de Clientes, com cadastro no topo e lista abaixo em largura total
- [x] Apresentar e aplicar a prévia escolhida do cadastro de cliente em linha única no desktop, com botão “+ Filial”
- [x] Reorganizar Novo cliente no topo em duas linhas e ampliar a lista de clientes para toda a largura
- [x] Permitir converter um cliente existente em unidade de outro cliente, transferindo automaticamente todos os vínculos
- [x] Substituir “Plataforma ERP” pelo novo botão compacto de Início nos cabeçalhos dos aplicativos
- [x] Manter o controle de modo claro/escuro somente na tela de Início
- [x] Remover o botão de Início da própria tela inicial e mantê-lo nas demais telas
- [x] Identificar por que os ícones corrigidos não aparecem em outros navegadores: versão publicada ainda não atualizada
- [x] Igualar os ícones da página principal aos ícones da Plataforma ERP
- [x] Reduzir e separar os ícones de ordem, editar e excluir das Etapas Adicionais no padrão compacto dos approvals
- [x] Garantir o padrão compacto dos ícones de ação em Todos os approvals, incluindo anexos
- [x] Corrigir os submenus de Approvals do perfil Financeiro do João de Deus
- [x] Restringir o alerta da Fila do Supply ao Time de Supply, sem incluí-lo apenas por ser Admin
- [x] Padronizar todos os botões de ação dos approvals pelo menor tamanho mostrado na captura
- [x] Exibir a Fila do Supply nos lembretes do app Supply e na Central de Pendências
- [x] Reduzir os botões de editar e excluir nas listas Meus com Supply e Fila do Supply, mantendo o anexo compacto
- [x] Ocultar tipos zerados na Central de Pendências e mostrar somente a mensagem quando não houver pendências
- [x] Corrigir listas vazias em Fila do Supply e Meus com Supply
- [x] Reorganizar Approvals em Aguardando minha aprovação, Meus em aprovação, Meus com Supply, Fila do Supply, Todos e Consolidado por Cargo
- [x] Restringir alterações do status operacional dos approvals ao Time de Supply e Admin
- [x] Padronizar o botão Excluir em Cadastro > Projetos com os demais botões de ação
- [x] Igualar o tamanho dos botões Editar e Excluir em Minhas Solicitações e alinhá-los à esquerda
- [x] Cadastrar Pontos de Entrega em Diversos e usar Sala Cittá como opção padrão no campo de entrega
- [x] Recuar a rede mesh para não sobrepor o card Code
- [x] Alterar o endereço publicado para erpmyio.lovable.app, mantendo a identificação por e-mail e senha antes do portal ERP
- [x] Aplicar tags de saída verde-claro e filtros no cabeçalho em Insumos de Instalação
- [x] Padronizar tags de saída em verde-claro e incluir filtros no cabeçalho das movimentações de estoque
- [x] Alinhar a exclusão à esquerda do Approval no desktop e mobile e substituir a lixeira por X
- [x] Excluir o filtro de possibilidades de entrega em Todos os approvals
- [x] Mover os filtros de “Pendentes comigo” e “Meus em aprovação” para cabeçalhos verdes no padrão de “Todos”
- [x] Permitir ao solicitante excluir ticket próprio ainda “Em aberto”, mantendo-o no histórico como “Excluído” e fora das pendências
- [x] Corrigir no mobile o conflito entre logomarca/nome do App e etiquetas de perfil e cargo
- [x] Padronizar os indicadores de situação com fundo verde-claro em todos os Apps
- [x] Corrigir a visualização dos anexos dos tickets com tamanho limitado e botão de fechar
- [x] Igualar a largura do filtro “Todos os status” ao filtro de entregues em Minhas solicitações
- [x] Manter ativo o controle de habilitação do Code em Acessos
- [x] Padronizar nomes dos aplicativos como Supply, Cash Flow e Code
- [x] Incluir alocação em Cliente para solicitações de Materiais
- [x] Criar o aplicativo Desenvolvimento para tickets de bugs e melhorias
- [x] Liberar automaticamente o Desenvolvimento para todos os usuários atuais e futuros
- [x] Manter os seis aplicativos na mesma linha no desktop
- [x] Incluir descrições contextuais para as alocações “Projeto” e “Cliente”
- [x] Exibir a descrição de despesa interna somente quando “Interna” estiver selecionada
- [x] Aumentar o espaço superior de “Tipo de solicitação” seguindo o padrão de “Alocação”
- [x] Alterar a mensagem vazia para “Nenhuma solicitação aberta.”
- [x] Trocar por verde-claro os destaques dos droplists em todos os aplicativos
- [x] Alinhar os botões “Aplicativos” e “Acessos” à base do título no desktop
- [x] Renomear “Usuários e aplicativos” para “Acessos” no portal
- [x] Igualar a largura dos botões “Aplicativos” e “Usuários e aplicativos” também no desktop
- [x] Simplificar a descrição do Cash Flow para “Gestão financeira”
- [x] Separar visualmente as três pessoas do funil no ícone do CRM
- [x] Igualar o tamanho dos botões “Aplicativos” e “Usuários e aplicativos” no portal
- [x] Corrigir o ícone do CRM para mostrar claramente três pessoas e um funil
- [x] Ampliar o ícone do RH para a mesma proporção dos demais aplicativos
- [x] Ampliar o ícone do Legal e alterar a descrição para “Contratos e Jurídico”
- [x] Alterar a descrição do CRM para “Vendas e Relacionamento”
- [x] Trocar o ícone do CRM por pessoas sobre um funil, na proporção dos demais aplicativos
- [x] Aumentar a margem superior dos ícones Supply e Cash Flow
- [x] Remover o círculo do cifrão do Cash Flow e ampliar o símbolo na proporção do Supply
- [x] Trocar o ícone do Supply por uma engrenagem maior e renomear para “Solicitações e Estoque”
- [x] Excluir no Cash Flow o Approval removido no Supply e conferir as listas atuais
- [x] Alinhar botões e nomes dos aplicativos na gestão de acessos mobile
- [x] Padronizar todos os botões de ação com fundo verde e ícones/textos pretos
- [x] Reservar o lilás apenas para títulos explicitamente definidos
- [x] Logo myio/supply: alinhar "myio" e "supply" pela parte inferior (recorte dos assets + items-end)
- [ ] Verificar visualmente o alinhamento do logo (hero + rodapé + dashboard)
- [x] Alinhar a primeira coluna de ícones do portal à esquerda com a logomarca e “Meus Aplicativos”
- [x] Botão "Criar conta" do mesmo tamanho do botão "Entrar" (auth)
- [x] Renomear menu "Projetos, Clientes e Centros de Custo" para "Cadastro"
- [x] Menus selecionados no padrão verde/preto do botão "Entrar"
- [x] Mover "Solicitações de Projetos" para dentro de "Novas Solicitações" como box "Dispositivos"
- [x] Encurtar "Reembolso de despesas" para "Reembolsos"
- [x] Trocar "comprador" por "time de supply"
- [x] Atualizar texto do Armazém
- [x] Centralizar checkbox Admin na tabela de usuários
- [x] Alinhar números dos boxes monetários à direita
- [x] Trocar rótulo "Comprador" por "Supply" (approval-workflow + meta twitter)
- [x] Agrupar nomes de mesmo perfil no mesmo box (tabela de usuários)
- [x] Restaurar organograma hierárquico mantendo agrupamento por perfil (approval-workflow)
- [x] Botão "Excluir" de projetos (Cadastro) virou ícone de lixeira vermelha
- [x] Projeto: checkbox "Implantado" (conclui projeto, impede novas solicitações) + campo data de implantação/cancelamento
- [x] Coluna "Item" mostrar Tipo de Solicitação (com subtipo de viagem) em vez da descrição
- [x] Evitar auto-aprovação: solicitações criadas pelo usuário não devem aparecer para ele mesmo aprovar
- [x] "Pendentes comigo": totalizador de approvals pendentes e total em R$ ao lado do título
- [x] Nova solicitação “Pagamento” com Centro de Custo obrigatório e Projeto/Cliente opcionais
- [x] Vincular Pagamento a Approval existente, mantendo número e histórico, com registro das duas datas/tipos
- [x] Encaminhar Pagamento criado por Financeiro direto ao CFO; demais cargos ao Financeiro
- [x] Separar Cargo (cadeia de aprovação) de Perfil (acesso às funcionalidades)
- [x] Permitir Função Operacional adicional separada do Cargo, inicialmente para Time de Supply
- [x] Cadastrar Funções Operacionais em Cadastro > Cargos e usar a lista no campo adicional dos usuários
- [x] Corrigir a alçada automática para não encaminhar ao CEO pedidos dentro do limite do solicitante
- [x] Criar perfis Admin, Padrão e Restrito, com menus configuráveis por checkboxes
- [x] Permitir atribuir um Cargo e um Perfil a cada usuário
- [x] Exclusão de usuários com dupla aprovação por outro Admin
- [x] Limitar a dois usuários com perfil Admin
- [x] Ordenar usuários por nome ou perfil
- [x] Manter Cargo e Perfil de acesso separados no resumo do usuário
- [x] Novos usuários iniciam com Perfil Restrito, sem cargo e com configuração pendente para Admin
- [x] Remover o cargo legado Solicitante das opções e associações atuais
- [x] Unificar a lista de cargos dos usuários e do organograma com os cargos ativos do Cadastro
- [x] Separar usuários sem menus em "Usuários pendentes" até a liberação do acesso
- [x] Mover "Perfis de Acesso" para "Usuários e Logs" como "Acesso Restrito"
- [x] Manter usuários Restritos sem aprovador em "Usuários pendentes" até concluir o cadastro
- [x] Corrigir permissão de Admin ao definir cargos aprovadores no Organograma de Aprovação
- [x] Renomear o menu principal “Approvals Pendentes” para “Approvals”
- [x] Reunir em Approvals os submenus “Pendentes comigo”, “Meus em aprovação” e “Todos”
- [x] Mostrar “Meus em aprovação” apenas com solicitações do usuário ainda não concluídas
- [x] Restringir “Todos” a usuários com cargo de aprovação e manter o acompanhamento pelo Status existente
- [x] Corrigir registros duplicados no Histórico de auditoria dos Approvals
- [x] Consolidar Organograma de Aprovação por cargo com N-1, N+1 e visualização gráfica
- [x] Impedir nomes duplicados em Cargos, Centros de Custo, Clientes e Projetos
- [x] Compactar a visualização do organograma para eliminar a rolagem lateral
- [x] Alinhar cada N-1 abaixo do respectivo N e reduzir ainda mais os boxes do organograma
- [x] Adicionar nome abreviado opcional aos cargos e utilizá-lo nos boxes do organograma
- [x] Simplificar os boxes do organograma para cargo, primeiro nome e alçada automática
- [x] Padronizar todos os boxes do organograma com a mesma largura e altura
- [x] Corrigir a sobreposição dos boxes do organograma sem criar rolagem lateral
- [x] Conectar verticalmente cada cargo aos seus subordinados no organograma
- [x] Definir novos usuários Restritos com alçada automática de R$ 1.000 e demais faixas zeradas
- [x] Adicionar alocação Interna para Materiais, Serviços e Viagens, sem Projeto ou Cliente

- [x] Exibir orçamento do projeto, comprometido, alerta de excesso e flag nos Approvals
- [x] Criar portal ERP após o login com myio supply e myio cash flow
- [x] Separar acesso aos aplicativos dos perfis e permissões internas do Supply
- [x] Criar gestão de aplicativos por usuário para Admins do ERP
- [x] Proteger o acesso direto aos aplicativos sem liberação
- [x] Permitir salvar solicitações com endereço digitado manualmente quando o Google Maps falhar

- [x] Simplificar acesso do portal para ícone lilás de engrenagens, sem card
- [x] Alterar o título do portal para “Meus Aplicativos”
- [x] Adicionar myio CRM e myio Legal ao portal, permissões e páginas “Em breve”
- [x] Deixar o ícone do myio supply somente com as engrenagens

- [x] Centralizar o texto da tag “Orçamento excedido” e alinhar sua largura ao número do Approval
- [x] Aplicar frame lilás arredondado ao ícone do Supply, nome interno sem negrito e descrição atualizada
- [x] Padronizar Cash Flow, CRM e Legal com ícones em frame lilás e ajustar o espaçamento das descrições
- [x] Reordenar as colunas do organograma e igualar as larguras de N-1 e N+1
- [x] Adicionar myio RH ao portal e às permissões com a frase “Gestão de Pessoas”
- [x] Remover o globo do ícone do myio RH e manter somente três pessoas
- [x] Reorganizar Etapas Adicionais em Cadastro > Diversos, com tipos configuráveis e vínculo à solicitação
- [x] Incluir filtros e ordenação na lista de Projetos
- [x] Bloquear exclusão de Projeto, Cliente ou Centro de Custo com solicitações e permitir realocação individual
- [x] Mover Etapas Adicionais de Cadastro > Diversos para Approval Workflow e manter Diversos disponível
- [x] Cadastrar Tipos de Etapa Adicional em Cadastro > Diversos e usá-los no dropdown das Etapas Adicionais
- [x] Cadastrar Tipos de Solicitação em Cadastro > Diversos e aplicar nomes/status nas telas
- [x] Transformar o número do Approval em link para um pop-up com todos os dados e gráfico de orçado x solicitado
- [x] Em Pendentes comigo, substituir a coluna Etapa por Projeto ou Cliente
- [x] Retirar o negrito do número do Approval nas listagens
- [x] Tornar genérica a apresentação dos cadastros dentro de Cadastro > Diversos
- [x] Adicionar botão “+” para criar Tipos de Etapa Adicional
- [x] Aplicar o mesmo processo de criação aos Tipos de Solicitação e futuros cadastros de Diversos

- [x] Excluir Tipo de Solicitação com alerta de vínculos e realocação individual antes da exclusão

- [x] Mover Quantidade para uma linha própria abaixo de Valor no Approval
- [x] Remover o texto “Decisão” do Approval

- [x] Alinhar os ícones de edição e exclusão em Tipos de Solicitação

- [x] Alinhar o número do Approval à esquerda no card móvel

- [x] Exibir o valor unitário em uma linha própria no Approval
- [x] Destacar em negrito o valor total dos approvals pendentes
- [x] Posicionar o ícone de exclusão abaixo do ícone de edição nos approvals
- [x] Renomear para Valor Total e posicioná-lo após Quantidade nos approvals
- [x] Exibir confirmação antes de aprovar uma solicitação
- [x] Reduzir a coluna Tipo e incluir Valor Total sem rolagem lateral na lista de solicitações
- [x] Melhorar a visualização mobile do organograma com a árvore moderna selecionada
- [x] Reduzir a fonte das datas dos logs e alinhá-las com os filtros Ação e Quem
- [x] Transformar Backup em submenu à direita de Logs
- [x] Exigir confirmação antes de gerar e baixar o backup em JSON
- [x] Criar em Approvals uma consolidação dos pendentes por cargo, quantidade e valor

- [x] Criar estrutura segura do myio cash flow no banco
- [x] Enviar approvals concluídos para Contas a pagar sem duplicidade
- [x] Criar Plano de Contas hierárquico com orçamento mensal por exercício
- [x] Criar Contas a pagar com classificação contábil obrigatória
- [x] Criar Caixa com contas bancárias, importação OFX/CSV e saldo
- [x] Criar conciliação total e parcial de pagamentos
- [x] Validar o myio cash flow no computador e celular

- [x] Permitir seleção de submenus para usuários com perfil Restrito
- [x] Padronizar o nome do myio cash flow com o myio supply e remover o título repetido
- [x] Simplificar e compactar a classificação de acessos Restritos
- [x] Compactar os indicadores de Contas a pagar e alinhar os valores à direita
- [x] Renomear situação para Classificar e aplicar o verde padrão myio
- [x] Exigir Emissão, Competência e Caixa mensais em pagamentos e movimentações do Cash Flow
- [x] Criar cadastro de Perfil de Acesso em Diversos e usar a lista nos usuários
- [x] Mover Perfil de Acesso para Perfis de acesso, antes dos Usuários Cadastrados
- [x] Permitir criar perfis com menus/submenus e atribuir perfil salvo ou acesso Customizado por usuário
- [x] Exibir perfil-base e destacar em lilás as diferenças dos acessos customizados

- [x] Incluir submenus de Armazém em duas colunas no seletor de acessos
- [x] Corrigir destaque indevido no perfil Restrito do Bruno Teles
- [x] Destacar em lilás somente submenus alterados, sem colorir o bloco inteiro
- [x] Filtrar a customização por nome e tornar Usuários e logs exclusivo do perfil Admin
- [x] Realocar Solicitações de Dispositivos myio para abaixo de Minhas Solicitações

- [x] Ajustar solicitações de Dispositivos myio: somente do próprio usuário, acesso pela lista de tipos, Cliente e Projeto independentes, Approval normal por quantidade e liberação após aprovação.
- [x] Exigir classificação Manutenção, Reposição por mal uso ou Upsell quando a solicitação de Dispositivos myio tiver Cliente.
- [x] Separar a seleção do tipo do formulário em Novas Solicitações e manter os campos ocultos até a escolha.
- [x] Remover o título redundante de Novas Solicitações acima da seleção do tipo.
- [x] Realocar Importações para Minhas Solicitações e restringir a criação a Novas Solicitações.
- [x] Garantir exclusão de Tipos de Solicitação sem vínculos e exigir realocação individual quando houver Approvals associados.
- [x] Abrir diretamente a tela específica ao selecionar Dispositivos myio ou Importação, sem botão intermediário.
- [x] Exibir os formulários de Dispositivos myio e Importação integrados abaixo do tipo selecionado, sem pop-up.
- [x] Separar visualmente os boxes de Reembolso e Contratação de RH da borda superior.
- [x] Substituir “Produto de reposição” pelas três classificações de cliente em Dispositivos myio.

- [x] Revisar a duplicidade visual entre Importações e Pedidos de Importação em Minhas Solicitações.
- [x] Consolidar Importações e Pedidos de Importação em um único bloco.
- [x] Alinhar os textos de acompanhamento aos tipos de solicitação exibidos em cada bloco.
- [x] Permitir configurar tipos de solicitação por Perfil de Acesso e tratar alterações individuais como customização.
- [x] Exibir os tipos dentro do box Solicitações, ao lado de Novas Solicitações, para todos os usuários e perfis.
- [x] Desmarcar os tipos quando o perfil ou usuário não tiver acesso a Novas Solicitações.
- [x] Restringir responsáveis pela liberação de produtos montados ao perfil Fábrica.
- [x] Trocar “produto” por “dispositivo” em todos os textos do pop-up de liberação.
- [x] Aplicar o fundo lilás myio ao botão de liberar dispositivo montado.
- [x] Padronizar as cores dos botões de todas as áreas do Armazém.
- [x] Usar o verde padrão nos botões principais do Armazém para melhorar a legibilidade.
- [x] Trocar Produto por Dispositivo no Estoque — Fábrica e em suas janelas.
- [x] Trocar Produto por Dispositivo no Estoque Myio e em suas janelas.
- [x] Reunir Expedição, Transporte, Cliente, Técnico, Perdido e Avariado dentro de Estoque e separar Dispositivos myio de Insumos de Instalação.
- [x] Mover Homologação para dentro de Fábrica e renomear Estoque — Fábrica para Estoque de Componentes.
- [x] Renomear o submenu Solicitações de Dispositivos myio para Solicitações.
- [x] Atualizar a descrição de Dispositivos myio para “Dispositivos produzidos pela Fábrica”.
- [x] Reposicionar Estoque de Componentes como o primeiro submenu de Fábrica.
- [x] Realocar Checar QR Code para Estoque, após Insumos de Instalação.
- [x] Realocar Transporte para dentro de Expedição, em bloco próprio abaixo do existente.
- [x] Realocar Perdido e Avariado para Dispositivos myio, em blocos próprios após o estoque.
- [x] Reordenar os submenus de Estoque e renomear Dispositivos myio para myio.
- [x] Cadastrar destinos de Estoque em Cadastro > Diversos e utilizar a lista nas movimentações.
- [x] Tornar Projeto e Cliente excludentes nas solicitações de Dispositivos myio e exigir uma classificação única para Cliente.
- [x] Renomear o formulário para “Nova solicitação de Dispositivos myio e Insumos de Instalação”.
- [x] Atualizar a orientação do formulário para informar a escolha exclusiva entre Projeto e Cliente.
- [x] Corrigir a visualização de solicitações de Dispositivos myio aprovadas para usuários do perfil Fábrica.
- [x] Corrigir a exclusão de solicitações de Dispositivos myio vinculadas indevidamente ao Cash Flow.
- [x] Exibir no Item do Approval a quantidade e os dispositivos/insumos realmente solicitados.
- [x] Separar “Itens da Solicitação” de “Tipo” nos cards e incluir a coluna na visualização desktop.
- [x] Corrigir a abertura dos anexos das solicitações em uma nova aba.
- [x] Substituir “descrição completa” pelo conteúdo do item nas solicitações.
- [x] Bloquear a exclusão de clientes com projetos ou solicitações vinculados e exigir realocação individual.
## Padronização dos cadastros em Diversos
- [x] Mapear todos os cadastros, vínculos e ações existentes
- [x] Disponibilizar edição e exclusão em cada cadastro
- [x] Bloquear exclusão vinculada e exigir realocação
- [x] Validar os fluxos e a interface
- [x] Condensar os cadastros de Diversos, mostrando somente o título e expandindo cada seção pelo botão “+”
- [x] Garantir confirmação antes de toda exclusão visível no sistema
- [x] Incluir exclusão confirmada em Produtos com os técnicos
- [x] Aplicar filtros por coluna e cabeçalho verde no Estoque — Almoxarifado
- [x] Aplicar filtros por coluna e cabeçalho verde no submenu myio
- [x] Aplicar filtros por coluna e cabeçalho verde em Insumos de Instalação
- [x] Remover o campo Cliente do cadastro de Novo Projeto
- [x] Remover a coluna Cliente da lista de Projetos
- [x] Padronizar os botões Zerar estoque em verde com texto preto, mantendo a confirmação existente

- [x] Concluir cadastro e uso dos Motivos de Avaria em Diversos
- [x] Aplicar ao botão Zerar estoque de Insumos de Instalação fundo verde e texto preto, preservando confirmação
- [x] Padronizar Estoque de Componentes com cabeçalho verde e filtros por coluna
- [x] Mover Liberar Dispositivo Montado para dentro do bloco Dispositivos montados liberados
- [x] Exibir cinco aplicativos por linha no desktop e três no celular, com ícones compactos
- [x] Remover “myio” dos nomes dos aplicativos no portal e manter a logomarca ao lado do nome dentro de cada aplicativo
- [x] Incluir retorno à Plataforma ERP sem encerrar a sessão em todos os aplicativos

- [x] Incluir o nome do solicitante no acompanhamento de tickets do Code.
- [x] Incluir Menu e Submenu opcionais na abertura e nos detalhes dos tickets do Code.
- [x] Criar Tipos de Estoque em Cadastro > Diversos e utilizar a lista atual no formulário de Materiais.

- [x] Usar nas páginas CRM e Legal os mesmos ícones exibidos no portal ERP

- [x] Incluir no RH a mensagem de aplicativo em desenvolvimento usada no CRM e Legal
- [x] Reduzir a largura dos botões Aplicativos e Acessos e alinhar Acessos ao ícone Code somente no desktop
- [x] Substituir Menu e Submenu do Code por listas dependentes do aplicativo e reposicioná-las após Aplicativo
- [x] Mover os filtros de acompanhamento do Code para o cabeçalho, no padrão dos Approvals
- [x] Mover os filtros de Minhas solicitações para cabeçalhos verdes, no padrão dos Approvals

## Fluxo de atendimento do Code
- [x] Restringir o responsável do ticket aos Admins com acesso ao Code
- [x] Alterar o fluxo para Em aberto, Em atendimento, Atendido e Concluído
- [x] Reservar a conclusão ao solicitante após o ticket ser marcado como Atendido
- [x] Exibir no ícone do Code a quantidade de tickets atendidos aguardando aceite

## Central de pendências da Plataforma ERP
- [x] Mapear todas as ações pendentes por usuário em cada aplicativo
- [x] Exibir contadores nos ícones dos aplicativos com pendências
- [x] Criar painel consolidado com natureza, quantidade e link para o menu correspondente
- [x] Incluir Approvals “Pendentes comigo”, aceite de tickets do Code e aprovações de exclusão de Admin
- [x] Validar atualização dos contadores após concluir cada ação

- [ ] Corrigir permissões críticas de centros de custo e demandas de compra/produção sem interromper os fluxos autorizados

- [x] Explicar que os alertas de segurança eram permissões antigas e foram detectados pela nova varredura, não causados pela troca do endereço

- [x] Verificar se https://erpmyio.lovable.app está funcional
- [x] Adicionar elemento gráfico de rede mesh no lado direito da página de acesso
- [x] Redesenhar o bloco de acesso para se integrar melhor ao fundo escuro
- [x] Reduzir o espaçamento vertical entre título, subtítulo e descrição na página de acesso
- [x] Preservar os mesmos ícones e tamanhos atuais dos aplicativos na página inicial de acesso

## Conversas nos tickets do Code
- [x] Criar conversa protegida entre Admin e Solicitante com perguntas e respostas imutáveis
- [x] Registrar mensagens no histórico do ticket
- [x] Iniciar o histórico de cada ticket com sua data de abertura
- [x] Gerar pendência ao Solicitante enquanto houver pergunta sem resposta
- [x] Manter tickets ativos como pendência do Admin até Atendido
- [x] Abrir o ticket correto pela Central de Pendências e validar os fluxos

## Vínculos de clientes, projetos e unidades
- [x] Vincular um novo projeto a um cliente ativo e bloquear novos custos após implantação
- [x] Permitir vincular uma unidade ou filial opcional ao criar um projeto
- [x] Permitir cadastrar filiais ou unidades vinculadas ao cliente corporativo
- [x] Disponibilizar unidade opcional em Novas Solicitações quando a alocação for Cliente
- [x] Exibir unidades de cada cliente em lista expansível e permitir editar ou excluir cada unidade

## Cadastro de clientes
- [x] Adicionar Razão social antes de Nome fantasia no cadastro e edição de clientes
- [x] Manter Nome fantasia como identificação em todas as telas e listas de seleção

## Layout dos cadastros
- [x] Reorganizar Centro de Custo com formulário superior em linha e listagem abaixo em largura total
- [x] Reorganizar Cargos com formulário superior em linha e listagem abaixo em largura total
- [x] Validar Centro de Custo e Cargos em desktop e celular
- [x] Incluir botão Editar em cada projeto, preservando os vínculos e campos atuais
## Padronização global dos botões compactos
- [x] Mapear botões +, -, editar e excluir em todas as telas e submenus
- [x] Padronizar dimensões conforme Cadastro > Clientes
- [x] Substituir ícones X de exclusão por lixeira
- [x] Validar Solicitações, Approvals, menus e submenus no desktop e mobile
- [x] Adicionar Cidade e UF às unidades/filiais, incluindo cadastro, edição, lista, filtro e conversão
- [x] Alinhar o seletor de UF do cadastro de cliente com os demais campos

## Categorias de clientes
- [x] Criar cadastro de categorias em Cadastro > Diversos com Shoppings e Lojas iniciais
- [x] Vincular categoria ao cadastro e edição de clientes e exibi-la na lista
- [x] Classificar os shoppings e as Obrasmax existentes nas categorias solicitadas
- [x] Ajustar o total geral para preto e número com o dobro do tamanho
- [x] Validar em computador e celular

## Relatório PDF de clientes
- [x] Adicionar botão de relatório ao lado do título Clientes
- [x] Permitir ordenar o PDF por UF, Categoria ou Cliente corporativo
- [x] Exportar clientes, unidades e todas as informações cadastrais
- [x] Validar o PDF e o fluxo em computador e celular

## Mapa de unidades por UF
- [x] Adicionar botão de mapa ao lado do título Clientes
- [x] Exibir mapa interativo do Brasil com quantidade de unidades por UF
- [x] Destacar a UF em verde-claro ao passar o cursor
- [x] Mostrar nome da unidade e cliente corporativo em uma janela sobre o mapa
- [x] Validar o mapa em computador e celular

## Totalizadores do relatório de clientes
- [x] Incluir resumo por UF com clientes, unidades e total
- [x] Incluir resumo por categoria com clientes, unidades e total
- [x] Validar todas as páginas do PDF

## Consolidação de tipos e cadastro de produtos
- [x] Consolidar “Dispositivos myio e Insumos de Instalação” em “Materiais” sem perder o fluxo por quantidade
- [x] Permitir cadastrar novos produtos somente para Admin ou Time de Supply
- [x] Ocultar Link de Referência e Valor Unitário dos demais usuários
- [x] Validar permissões, formulário e tipos disponíveis

## Solicitação com vários materiais
- [x] Permitir adicionar e remover blocos de material com quantidade
- [x] Mover categorias para seletores externos que filtram cada lista
- [x] Compartilhar destinatário, entrega, prazo, observações e anexos
- [x] Gerar um único Approval para todos os materiais da solicitação
- [x] Validar envio, estoque, aprovação e visualização em computador e celular
- [x] Confirmar e informar a categoria atual dos antigos Dispositivos myio
- [x] Verificar por que produtos myio fabricados do Almoxarifado não aparecem na lista de Materiais

## Dispositivos myio em Cadastro e Solicitações
- [x] Manter as opções “Cadastrado” e “Novo” e o botão para adicionar vários materiais
- [x] Adicionar a lista “Dispositivos myio” em Cadastro > Diversos
- [x] Adicionar o checkbox “Dispositivos myio” nas categorias da solicitação
- [x] Reunir dispositivos e materiais no mesmo Approval, preservando seus fluxos de estoque
- [x] Validar cadastro, solicitação e acompanhamento em computador e celular
- [x] Confirmar visualmente a prévia antes de informar conclusão ou orientar nova publicação

## Confirmação obrigatória em exclusões
- [x] Exigir confirmação ao remover materiais, anexos, trechos, reembolsos, unidades e QR codes em formulários
- [x] Auditar novamente todas as ações de exclusão do sistema
- [x] Validar cancelamento e confirmação no computador e celular

## Pesquisa nos destinos de realocação
- [x] Permitir digitar para filtrar projetos, clientes e unidades/filiais
- [x] Manter os destinos agrupados por categoria
- [x] Validar a seleção pesquisável em computador e celular

## Realocação de Novos Produtos P&D
- [x] Realocar os Approvals 202607210001, 202607290001 e 202607300001 para Interna
- [x] Preservar e conferir os vínculos derivados dos três Approvals

## Edição administrativa de Approvals
- [x] Incluir lápis para Admin nas listas de Approvals
- [x] Permitir editar dados da solicitação e centro de custo sem alterar etapas ou decisões
- [x] Sincronizar Approvals concluídos com Cash Flow e vínculos derivados
- [x] Registrar as alterações no histórico e recalcular orçamento
- [x] Validar permissões, desktop e celular

## Tipos de solicitação do perfil Admin
- [x] Exibir todos os tipos ativos como selecionados para usuários Admin
- [x] Validar Bruno e João Paulo no computador e celular

## Localização das Funções Operacionais
- [x] Confirmar onde o cadastro de Função Operacional Adicional está disponível

## Campos parametrizáveis das solicitações
- [x] Adicionar quatro controles no bloco de Solicitações dos Perfis de acesso
- [x] Ocultar Centro de Custo, Item novo, Estoque e Interna do perfil Operação por padrão
- [x] Preservar a customização individual por usuário
- [x] Validar os perfis no computador e celular

## Função Operacional Adicional
- [x] Explicar a lógica atual de Funções Operacionais
- [x] Avaliar a composição de permissões entre o cargo principal e a função adicional

## Cargos adicionais
- [x] Criar vínculos de múltiplos cargos adicionais com proteção administrativa
- [x] Manter o cargo principal como origem das solicitações e somar cargos adicionais aos aprovadores
- [x] Substituir Função Operacional Adicional por Cargos adicionais no cadastro de usuários
- [x] Remover a aba Funções Operacionais do Cadastro de Cargos
- [x] Migrar Alexandre Ribeiro para o cargo adicional Analista de Supply
- [x] Validar acessos, aprovações, computador e celular
- [x] Exibir no organograma os colaboradores que exercem cargos principais ou adicionais
- [x] Validar nomes dos ocupantes no organograma em computador e celular

## Conectores da hierarquia de aprovação
- [x] Remover a linha horizontal quando houver somente um box no nível seguinte
- [x] Limitar cada linha horizontal ao centro dos conectores extremos, sem ultrapassar os boxes
- [x] Validar a hierarquia com ramificações simples e múltiplas
- [x] Fazer os conectores verticais terminarem e iniciarem no limite da linha horizontal
- [x] Validar as junções no computador e celular
- [x] Corrigir a sobreposição ainda visível nas junções dos segmentos horizontais
- [x] Gerar e mostrar uma nova prévia ampliada sem conectores ultrapassando a linha horizontal

## Aparência de Cargos adicionais
- [x] Remover o fundo colorido do campo Cargos adicionais
- [x] Manter aparência neutra e validar no computador e celular

## Correção dos campos parametrizáveis em Perfis de acesso
- [x] Exibir os quatro controles no mesmo bloco de Tipos de solicitação
- [x] Aplicar e salvar as permissões por perfil e por usuário
- [x] Validar perfil Operação no computador e celular
- [x] Confirmar e corrigir a ausência dos quatro controles no perfil individual de Alexandre
- [x] Mostrar a prévia corrigida ao usuário antes de declarar conclusão
- [x] Exibir no chat as prévias dos controles e dos conectores para conferência
- [x] Incluir controles independentes para Alocação: Projeto e Alocação: Cliente
- [x] Ocultar no novo pedido as alocações desmarcadas no perfil

## Exclusão de perfis de acesso
- [x] Verificar por que alguns perfis não exibem o botão de exclusão
- [x] Ajustar a regra conforme a proteção necessária dos perfis em uso ou do sistema

## Esclarecimento das faixas de aprovação
- [x] Confirmar a posição de “Aprovado por (cargo)” em relação às Faixas 2 e 3
- [x] Conferir a explicação exibida para Faixa 2, Faixa 3 e C-Level contra a regra real
- [x] Corrigir o texto explicativo se ele estiver deslocando os níveis de aprovação
- [x] Exibir no texto: Faixa 2 = Gestor Direto; Faixa 3 acrescenta Gestor da Área; C-Level somente acima

## Exclusão e realocação de perfis de acesso
- [x] Permitir ao Admin editar e excluir qualquer perfil, inclusive os atuais perfis do sistema
- [x] Antes de excluir perfil com usuários vinculados, exigir escolha de outro perfil para realocação
- [x] Realocar usuários e excluir o perfil em uma única operação segura
- [x] Validar o fluxo completo e mostrar prévia antes de declarar conclusão

## Alçadas para cargos C-Level
- [x] Identificar usuários cujo cargo principal é C-Level
- [x] Para C-Level, mostrar somente Aprovação automática e Faixa 2
- [x] Garantir que a regra use apenas o CEO como nível superior
- [x] Para o CEO, permitir selecionar um aprovador específico, normalmente o CFO
- [x] Aplicar o aprovador escolhido do CEO na geração da cadeia
- [x] Não incluir o Conselho de Administração na cadeia de despesas/approvals do CEO
- [x] Validar visualmente em desktop e celular

## Remoção do Conselho das aprovações
- [x] Remover o Conselho de Administração como superior na hierarquia
- [x] Excluir o Conselho das sequências atuais e do organograma de aprovação
- [x] Validar a alteração visualmente em computador e celular

## Realocação individual na exclusão de perfil
- [x] Listar individualmente os usuários vinculados ao perfil que será excluído
- [x] Permitir selecionar um perfil de destino diferente para cada usuário
- [x] Executar todas as realocações e a exclusão do perfil em uma única operação segura
- [x] Validar o fluxo em computador e celular e mostrar a prévia

## Fonte única das alçadas de aprovação
- [x] Remover os campos editáveis de Aprovação automática, Faixa 2 e Faixa 3 do menu Usuários
- [x] Validar que os valores permanecem editáveis somente em Alçadas de Aprovação

## Aprovação conjunta configurável
- [x] Permitir ao Admin selecionar os dois cargos da aprovação conjunta
- [x] Identificar os cargos por vínculo e sigla, incluindo cargos adicionais
- [x] Exigir somente o aprovador configurado que ainda não participou da cadeia normal
- [x] Impedir aprovação automática acima do limite da aprovação conjunta
- [x] Validar a regra e a configuração em computador e celular, mostrando a prévia
