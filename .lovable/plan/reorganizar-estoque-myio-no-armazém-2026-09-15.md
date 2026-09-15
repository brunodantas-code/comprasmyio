# Reorganizar Estoque Myio no Armazém

## Objetivo
Transformar **Estoque Myio** em um agrupador dentro de **Armazém**, reunindo nele todas as etapas do fluxo dos dispositivos e separando os dois estoques atualmente exibidos juntos.

## Alterações
- Renomear o submenu principal **Estoque Myio** de Armazém para **Estoque**.
- Remover da primeira linha de Armazém: **Expedição**, **Transporte**, **Cliente**, **Técnico**, **Perdido** e **Itens Avariados**.
- Exibir essas áreas como submenus dentro de **Estoque**, preservando suas telas e permissões atuais.
- Organizar os submenus de **Estoque** nesta sequência:
  1. Solicitações de Dispositivos myio
  2. Dispositivos myio
  3. Insumos de Instalação
  4. Expedição
  5. Transporte
  6. Cliente
  7. Técnico
  8. Perdido
  9. Avariado
- Renomear **Estoque — Myio** para **Dispositivos myio**.
- Tirar **Insumos de Instalação** de dentro da tela de dispositivos e torná-lo um submenu próprio logo após **Dispositivos myio**.

## Compatibilidade
- Manter as chaves e permissões existentes de cada área, sem alterar os acessos já configurados.
- Mostrar o agrupador **Estoque** quando o usuário tiver acesso a pelo menos um de seus submenus e abrir automaticamente o primeiro permitido.
- Preservar os demais menus do Armazém e todo o conteúdo funcional das telas realocadas.

## Validação
- Conferir a nova hierarquia e ordem no computador e no celular.
- Confirmar que usuários com acesso parcial veem somente os submenus autorizados.
- Confirmar que **Dispositivos myio** não contém mais o bloco **Insumos de Instalação**.
- Confirmar que nenhuma área realocada aparece duplicada na primeira linha do Armazém.

## Detalhes técnicos
- Reestruturar as abas em `StockTab` para separar as áreas de nível principal das abas internas de Estoque.
- Extrair o conteúdo de dispositivos e de insumos em conteúdos independentes, reutilizando consultas e ações existentes.
- Ajustar apenas o rótulo de `armazem_estoque_myio` na configuração de perfis; manter as permissões filhas atuais para as áreas realocadas.
