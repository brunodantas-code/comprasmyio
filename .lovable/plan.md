# Ajustar o alinhamento do organograma

## Objetivo
Exibir cada cargo subordinado diretamente abaixo do seu superior, mantendo o organograma inteiro dentro da largura disponível.

## Alterações
- Trocar o agrupamento apenas por níveis por uma árvore visual baseada nas relações N/N-1.
- Centralizar cada cargo superior sobre o conjunto dos seus subordinados diretos.
- Reduzir largura, altura, espaçamentos e textos dos cartões, preservando a leitura de cargos e usuários.
- Manter a adaptação para telas menores sem rolagem lateral.

## Validação
- Confirmar visualmente que cada N-1 aparece abaixo do respectivo N.
- Conferir o organograma em computador e celular, sem rolagem horizontal.
