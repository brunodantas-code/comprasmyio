# Checklist padrão para Shoppings

## Objetivo
Disponibilizar automaticamente, em toda OS de cliente da categoria **Shoppings**, o checklist completo já solicitado, organizado na ordem cronológica da visita. O cadastro administrativo continuará permitindo ajustar perguntas, opções, obrigatoriedade e ordem sem alterar respostas históricas.

## O que será implementado

1. **Modelo padrão Shoppings**
   - Criar um modelo padrão vinculado à categoria Shoppings.
   - Aplicá-lo automaticamente ao criar uma OS de shopping, sem exigir escolha manual.
   - Preservar o modelo e as respostas das OSs já iniciadas.

2. **Etapas cronológicas**
   - Preparação pré-visita.
   - Chegada e responsáveis.
   - Condições e perfil do local.
   - Água e hidrômetro.
   - Instalação elétrica.
   - Materiais necessários.
   - Revisão, pendências, fotos e encerramento.

3. **Perguntas e regras solicitadas**
   - Incluir celular, powerbank, parafusadeira, OS cadastrada, cliente contactado, áreas externas, restrição de horário e acompanhantes.
   - Incluir perfil de consumo, acesso/localização do hidrômetro, registro, fluxo, vazão, flange, tubulação e saída pulsada.
   - Incluir ponto e encaminhamento elétrico e materiais necessários.
   - Aplicar seleção única ou múltipla conforme cada pergunta, além dos detalhes e fotos condicionais já definidos.
   - Impedir o avanço quando faltar resposta, detalhe ou foto obrigatória.

4. **Configuração administrativa**
   - Permitir editar título, descrição, ordem, tipo, obrigatoriedade e opções de cada pergunta.
   - Permitir ativar/desativar opções sem apagar respostas antigas.
   - Manter vazões, diâmetros, materiais, tipos de chave e bitolas em **Cadastro > Diversos**.
   - Exigir confirmação antes de excluir ou desativar itens vinculados.

5. **Execução da OS**
   - Exibir uma etapa por vez, com progresso salvo.
   - Mostrar campos condicionais somente quando aplicáveis.
   - Permitir fotos por câmera ou galeria nos pontos previstos.
   - Manter as respostas vinculadas à OS e disponíveis para revisão.

6. **Integrações dependentes**
   - Abrir tickets automáticos no Code para parafusadeira sem carga/problema, OS não cadastrada e cliente não contactado.
   - Preparar a previsão do tempo para áreas externas; a consulta automática dependerá da definição da fonte meteorológica.

## Validação
- Testar criação de OS de Shopping com seleção automática do checklist.
- Testar todas as condições, obrigatoriedades, fotos e bloqueios de avanço.
- Testar edição administrativa sem perda de respostas existentes.
- Validar em computador e celular e conferir que o projeto permanece sem erros.

## Observação técnica
A estrutura existente de modelos, seções, perguntas e respostas será ampliada para suportar seleção única, seleção múltipla, regras condicionais, anexos por pergunta, versionamento e vínculo do modelo à categoria de cliente. As opções editáveis serão armazenadas como configuração; respostas antigas conservarão o texto e a versão usados no momento do preenchimento.
