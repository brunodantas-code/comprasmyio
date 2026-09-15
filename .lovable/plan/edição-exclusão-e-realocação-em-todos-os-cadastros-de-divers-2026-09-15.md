# Edição, exclusão e realocação em todos os cadastros de Diversos

## Objetivo
Padronizar todos os cadastros atuais e futuros de **Cadastro > Diversos** para sempre oferecer edição e exclusão segura. Antes de excluir, o sistema verificará vínculos existentes e, quando houver, exigirá a realocação para outro registro compatível.

## Alterações na tela
- Manter a edição disponível em **Tipos de Solicitação**, **Tipos de Etapa Adicional** e **Destinos de Estoque**.
- Incluir a ação de exclusão em **Destinos de Estoque**, seguindo o mesmo padrão visual dos demais cadastros.
- Usar uma janela única de exclusão segura nos três cadastros.
- Ao abrir a exclusão, verificar os vínculos e listar cada registro relacionado com identificação e detalhe.
- Quando houver vínculos, manter **Excluir** bloqueado e permitir a realocação individual para outro item ativo do mesmo cadastro.
- Atualizar a lista imediatamente após cada realocação; liberar **Excluir** somente quando nenhum vínculo permanecer.
- Quando não houver outro destino possível, orientar a cadastrar ou ativar uma opção antes da exclusão.
- Para tipos estruturais protegidos pelo sistema, manter a edição do nome/status, mas informar claramente quando a exclusão não for permitida.

## Vínculos cobertos
- **Tipos de Solicitação:** solicitações/Approvals, permissões de usuários e perfis e configurações de etapas que usam o tipo.
- **Tipos de Etapa Adicional:** regras cadastradas no Approval Workflow.
- **Destinos de Estoque:** dispositivos atualmente associados ao destino; a realocação preservará as regras operacionais do destino escolhido.

## Regras no banco de dados
- Criar operações administrativas seguras para consultar vínculos e realocá-los por cadastro e registro.
- Validar no banco que origem e destino são diferentes, existem e pertencem ao mesmo cadastro.
- Executar cada realocação de forma atômica, incluindo referências derivadas que precisem acompanhar a mudança.
- Bloquear exclusões diretas quando ainda existirem vínculos, mesmo fora da interface.
- Preservar códigos internos e tipos estruturais necessários aos formulários e regras do sistema.
- Manter acesso de leitura para usuários autenticados e restringir edição, realocação e exclusão aos administradores já autorizados em Diversos.

## Padrão para futuros cadastros
- Reutilizar o mesmo fluxo de edição, consulta de vínculos, realocação e exclusão.
- Todo novo cadastro em Diversos deverá declarar quais registros o referenciam e como cada vínculo é realocado antes de ser disponibilizado.

## Validação
- Confirmar edição e exclusão sem vínculos nos três cadastros.
- Confirmar bloqueio, listagem e realocação individual quando houver vínculos.
- Confirmar que a exclusão só é liberada após zerar os vínculos.
- Confirmar que solicitações, permissões, etapas e dispositivos continuam apontando para o novo registro.
- Verificar o comportamento em computador e celular, além da compilação e execução da aplicação.

## Detalhes técnicos
A janela de exclusão existente será generalizada por tipo de cadastro, enquanto funções do banco centralizarão a descoberta e a realocação dos vínculos. Destinos de Estoque receberão referência persistente compatível com o estado operacional atual, evitando depender apenas de textos livres. Tipos de Solicitação protegidos continuarão respeitando as regras estruturais existentes.
