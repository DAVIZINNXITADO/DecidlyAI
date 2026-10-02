# Configuração de anúncios do DecidlyAI

## Escopo permitido

- **Workspace (desktop):** um banner vertical compacto `160×300` no rodapé da barra lateral, abaixo do histórico. Não inserir banners no feed, junto ao campo de mensagem ou sobre respostas da IA.
- **Workspace:** Social Bar padrão do Adsterra inicia automaticamente depois de 90 segundos com a aba visível; se o usuário estiver digitando, o carregamento é adiado. Não exibir o banner da sidebar no celular.
- **Homepage (`/` / `index.tsx`):** sem anúncios, conforme exclusão expressa.
- **Blog (`/blog`):** um banner entre os cards da listagem; sem faixa no cabeçalho.
- **Como funciona (`/como-funciona`) e Tecnologia (`/tecnologia`):** um único banner responsivo entre a explicação e o CTA final.
- **Créditos (`/credits`):** um banner depois do resumo da carteira e dos links de navegação.
- **Créditos grátis (`/credits/free`):** o Native Banner `300×250` abaixo do card de saldo/renovação diária.
- **Histórico (`/credits/history`):** um banner no rodapé, após as movimentações.
- **Rotas sem anúncios:** `/`, `/login`, `/reset-password` (Nova Senha), `/credits/buy`, `/privacy`, `/terms` e `/cookies`.

## Sem anúncios recompensados

O produto não deve oferecer visualizações de anúncios em troca de créditos nem chamar anúncios display de “recompensados”. Uma migration foi preparada para revogar as RPCs legadas `start_sponsored_reward` e `claim_sponsored_reward` quando for aplicada ao banco; ela não apaga linhas já existentes em `sponsored_reward_sessions`.

## Comportamento dos formatos

- O Social Bar inicia automaticamente após 90 segundos no Workspace, em qualquer viewport; exige aba visível e adia enquanto um campo de texto está focado.
- Banners e Social Bar não carregam nem são renderizados antes do aceite de cookies não essenciais. Recusar impede inserir os scripts Adsterra.
- Banners carregam próximo à viewport, enfileirando os scripts para evitar concorrência em `window.atOptions`; quando não há preenchimento, o slot é ocultado.
- Não repetir scripts de zona, criar refresh manual ou alterar dimensões do criativo com CSS.
- O frame do anúncio pode usar fundo e contorno arredondado sutil, sem cortar, esticar, sobrepor ou mudar a proporção do criativo.
- Os cinco tamanhos Banner são `728×90`, `468×60`, `320×50`, `160×300` e `160×600`. O Native Banner `300×250` é uma zona separada. As zonas horizontais são escolhidas conforme a largura disponível; `160×300` está no rodapé da sidebar desktop; `160×600` permanece disponível para uma coluna alta sem slot definido.
- Categorias de anúncios e bloqueios de conteúdo dependem das configurações na conta Adsterra e precisam ser verificados diretamente no painel do publisher.

## Inventário encontrado no repositório

O código contém os cinco tamanhos Banner (`320×50`, `468×60`, `728×90`, `160×300` e `160×600`), um Native Banner (`300×250`) e a Social Bar. O `468×60` participa da seleção responsiva, o `160×300` está no rodapé do Workspace desktop e o Native Banner está em `/credits/free`; `160×600` ainda não está montado. O Popunder é o único dos oito formatos informados que não encontrei nos arquivos/snippets disponíveis para esta alteração. O fluxo antigo em `/credits/sponsored` era recompensado por visualização e foi removido/desativado; não será reutilizado como Popunder.

## Antes de publicar

1. Confirmar que domínio, publisher ID, `ads.txt` e zonas estão corretos na conta Adsterra.
2. Validar a política de consentimento e privacidade para os países atendidos; o aviso agora bloqueia scripts até o aceite, mas a revisão legal e regional continua necessária.
3. Testar responsividade, bloqueadores de anúncios, falhas de rede e comportamento real de preenchimento no domínio de produção.
