# Plano — aplicativo Site Survey

## Objetivo
Criar o aplicativo **Site Survey** no portal ERP, identificado por um ícone de lupa e seguindo o mesmo padrão visual, de navegação e de acesso dos demais aplicativos.

## Escopo funcional
- Adicionar o Site Survey ao portal e à gestão de acessos por usuário.
- Criar fluxo completo de visitas: **Agendada → Em andamento → Em revisão → Concluída**, incluindo cancelamento.
- Vincular cada visita a um cliente e/ou projeto existente e a um técnico responsável.
- Permitir data, horário, local da visita, contato no local e observações.
- Preparar checklists configuráveis pelo Admin, com perguntas e caixas de seleção; o conteúdo inicial será incluído quando fornecido.
- Permitir fotos e anexos organizados por visita e, quando aplicável, por pergunta.
- Manter histórico das alterações de situação, responsável e conteúdo.

## Perfis e permissões
Criar permissões independentes para:
- visualizar visitas;
- criar e agendar;
- editar;
- executar/preencher;
- concluir e enviar para revisão;
- revisar/reabrir;
- administrar modelos de checklist e permissões.

Usuários comuns verão apenas as visitas permitidas pelo perfil; administradores do aplicativo poderão gerenciar todas.

## Telas
- **Agenda/Visitas:** indicadores, filtros e lista das visitas.
- **Nova visita / Editar:** cliente, projeto, técnico, data, local e contato.
- **Execução:** checklist, observações, fotos e anexos, adequado ao uso em celular.
- **Revisão:** resumo completo, pendências, conclusão ou devolução para ajustes.
- **Configurações:** modelos, perguntas, opções e permissões por perfil.

## Integração com o ERP
- Reutilizar clientes, unidades/filiais, projetos e usuários já cadastrados.
- Incluir `site_survey` no controle atual de aplicativos e no cadastro de tickets do Code.
- Aplicar confirmação antes de qualquer exclusão.
- Incluir os novos dados no backup geral do ERP.

## Implementação técnica
- Criar tabelas para visitas, modelos, seções, perguntas, respostas, anexos, histórico e permissões, todas com controle de acesso no banco.
- Criar armazenamento privado para fotos e documentos, acessível somente por usuários autorizados.
- Criar a rota protegida `/site-survey` com metadados próprios.
- Usar componentes e tokens visuais existentes; não alterar o desenho dos outros aplicativos.
- Inserir apenas a estrutura do checklist nesta etapa, sem inventar perguntas que ainda serão fornecidas.

## Validação
- Validar criação, agendamento, execução, revisão, conclusão, reabertura, anexos e restrições por perfil.
- Conferir a experiência em computador e celular.
- Mostrar a prévia antes de declarar a entrega concluída.
