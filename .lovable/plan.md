# Portal ERP myio e acesso por aplicativo

## Resultado
- Após entrar com e-mail e senha, o usuário será direcionado ao novo portal ERP da myio, não diretamente ao myio supply.
- O portal mostrará somente os aplicativos liberados para aquele usuário.
- Nesta primeira versão haverá **myio supply** e **myio cash flow**; o Cash Flow abrirá uma tela “Em breve”.
- Os Admins atuais do myio supply começarão também como Admins do ERP.

## Experiência do usuário
- Criar uma tela inicial do ERP com identidade “myio” e uma grade de aplicativos.
- O cartão **myio supply** abrirá o sistema atual.
- O cartão **myio cash flow** abrirá uma página própria com o estado “Em breve”.
- Incluir saída da conta e identificação do usuário no portal.
- Dentro do myio supply, o logotipo/link de retorno levará ao portal de aplicativos.
- Manter intacto o menu **Usuários e logs** dentro do myio supply.

## Administração do ERP
- Criar no portal um menu **Usuários e aplicativos**, visível somente para Admins do ERP.
- Listar usuários e permitir liberar ou remover, separadamente, o acesso ao **myio supply** e ao **myio cash flow**.
- Manter a administração do ERP independente de Cargo, Perfil Admin/Padrão/Restrito e permissões internas do myio supply.
- Impedir que um usuário abra diretamente um aplicativo sem a respectiva liberação.

## Dados e segurança
- Criar um catálogo de aplicativos, uma tabela de acesso de usuário por aplicativo e uma tabela separada de funções administrativas do ERP.
- Aplicar permissões no banco para que usuários consultem apenas os próprios acessos e apenas Admins do ERP gerenciem acessos de terceiros.
- Inicializar os dois aplicativos; conceder myio supply aos usuários atuais para não interromper o uso; conceder função Admin do ERP aos Admins atuais.
- Novos usuários entrarão no portal sem aplicativos liberados até configuração do Admin do ERP.

## Ajustes de navegação
- Redirecionar login, cadastro confirmado e redefinição de senha concluída para o portal ERP.
- Atualizar links que hoje levam usuários autenticados diretamente ao painel do supply.
- Adicionar títulos e descrições próprios para portal, myio supply e myio cash flow.

## Validação
- Testar login e chegada ao portal.
- Validar usuário com somente Supply, somente Cash Flow, ambos e nenhum aplicativo.
- Validar que apenas Admin do ERP vê e altera **Usuários e aplicativos**.
- Validar que permissões internas do Supply permanecem inalteradas.
- Verificar visualmente desktop e celular, sem rolagem lateral.
