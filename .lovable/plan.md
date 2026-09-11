# Impedir cadastros duplicados

## Objetivo
Impedir a criação de Cargos, Centros de Custo, Clientes e Projetos com nomes já cadastrados, considerando equivalentes nomes com diferenças apenas de maiúsculas, minúsculas ou espaços nas extremidades.

## Implementação
- Criar proteção definitiva no banco para garantir nome único nos quatro cadastros, inclusive quando duas pessoas tentarem salvar simultaneamente.
- Manter a consulta da lista atual antes do envio para dar retorno imediato ao usuário.
- Exibir mensagens específicas: “Este cargo já está cadastrado”, “Este centro de custo já está cadastrado”, “Este cliente já está cadastrado” ou “Este projeto já está cadastrado”.
- Aplicar a mesma proteção ao renomear registros, evitando que uma edição produza duplicidade.
- Preservar os registros atuais; a verificação confirmou que não existem nomes duplicados hoje.

## Validação
- Testar nomes idênticos e variações de maiúsculas/minúsculas nos quatro formulários.
- Confirmar que cadastros inéditos continuam funcionando.
- Verificar a compilação e os avisos da aplicação após as mudanças.

## Detalhes técnicos
A unicidade será aplicada com índices únicos sobre `lower(trim(name))`. A interface fará uma verificação antecipada e também traduzirá a rejeição definitiva do banco para uma mensagem amigável.
