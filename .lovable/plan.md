# Integração do CRM myio dentro do ERP

## Objetivo
Trazer o CRM (hoje em crm-myio.vercel.app, app Next.js separado com login e banco próprios) para dentro do ERP, como um aplicativo interno no padrão dos demais (Supply, Code, Legal etc.), com o mesmo login, as mesmas permissões e o mesmo visual CDE. O link externo será substituído ao final.

## O que o CRM tem hoje (levantado do código-fonte enviado)
- **Leads**: lista e quadro (kanban), importação por CSV, etapas configuráveis, follow-up, contatos, status de WhatsApp.
- **Empresas e Contatos**: cadastro com CNPJ, busca de CNPJ, municípios IBGE, papéis de contato.
- **Funil e Oportunidades**: quadro por fases configuráveis, próxima ação, conversão de lead em oportunidade.
- **Propostas**: assistente de criação, levantamento a partir de arquivos (usa IA), geração de DOCX, importação, pendências de envio, memória de cálculo.
- **Custeio e Preços**: insumos, produtos myio, kits, tabelas de preço, regras de medição e composição, análise de custos, parâmetros do motor de cálculo.
- **Configurações**: fases do funil, etapas de lead, templates de mensagem e de proposta, usuários e perfis (admin/comercial).
- **Banco**: 44 tabelas e 46 migrações.

## Como será feito

### Fase 1 — Base de dados no ERP
- Criar as tabelas do CRM no banco do ERP (Lovable Cloud), com prefixo `crm_` para não colidir com tabelas existentes.
- Permissões por linha (RLS): quem tem acesso ao app CRM no ERP enxerga os dados; perfil admin do CRM gerencia configurações e usuários.
- Usuários do CRM passam a ser os próprios usuários do ERP (sem segundo login).

### Fase 2 — Telas principais
- Dashboard, Painel, Leads (lista, quadro, importação CSV, etapas), Empresas e Contatos, Funil (quadro por fases) e Oportunidades.
- Visual no padrão do ERP: cabeçalhos de tabela, filtros, botões e campos conforme o CDE.

### Fase 3 — Propostas (núcleo concluído: lista, editor, pendências, versões, DOCX padrão; falta IA de levantamento e memória de cálculo)
- Assistente de proposta, edição, memória de cálculo, pendências.
- Geração de DOCX (modelos atuais precisam ser enviados — estão fora do arquivo de código).
- Levantamento por arquivos com IA via Lovable AI (substitui a integração atual).

### Fase 4 — Custeio e Preços — CONCLUÍDA (tabela de preços, kits, lotes, parâmetros, memória de cálculo)
- Insumos, produtos, kits, tabelas de preço, regras de medição/composição, análise de custos e motor de cálculo.

### Fase 5 — Configurações e integrações
- Fases, etapas, templates, papéis de contato, busca de CNPJ e municípios IBGE.
- Status de WhatsApp (avaliar viabilidade da integração atual dentro do ERP).

### Fase 6 — Migração dos dados atuais
- **Preciso de um export dos dados atuais do CRM** (backup do banco, gerado pelo João Paulo com o script `backup-db.sh` do próprio CRM) para importar empresas, leads, oportunidades, propostas e tabelas de preço sem perder nada.

### Fase 7 — Vínculos e desativação do CRM antigo
- Ações de Atas (Legal) e To Dos (Central) vinculadas a registros do CRM, como solicitado.
- Ícone CRM do portal passa a abrir o módulo interno; o acesso externo é desativado quando a migração estiver validada.

## Observações
- Trabalho grande, entregue em fases; cada fase fica utilizável e verificada antes da próxima.
- **Garantia de isolamento**: o arquivo MD é usado apenas como referência de leitura. Nada no CRM atual será alterado — banco de dados, layout e customizações permanecem intactos, e o acesso externo (ex.: João pela máquina dele, sem passar pelo ERP) continua funcionando até a Fase 7, quando você decidir desativá-lo.
- O código-fonte enviado não inclui imagens, modelos DOCX e dados; vou solicitá-los quando cada fase precisar.
