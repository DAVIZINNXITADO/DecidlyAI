# Política de anúncios do DecidlyAI

## Estado atual

A integração Monetag foi removida do frontend. Também foram removidos:

- Vignette;
- Direct Link;
- Popunder;
- Smartlink;
- anúncio recompensado;
- página de oferta patrocinada;
- contador que concedia créditos por visita.

## Adsterra ativo

### Social Bar

O Social Bar é carregado somente quando o usuário entra no `/workspace`, por meio de `src/components/AdsterraAds.tsx`. Ele não é carregado no chat público, nas páginas institucionais ou nas páginas de créditos.

### Native Banner 1:1

O Native Banner é carregado somente na visão geral de `/credits`, dentro de um cartão contido e identificado como publicidade. Ele não aparece dentro do compositor, entre mensagens ou na tela de geração.

## Regras de experiência

- não recompensar cliques ou visitas a anúncios;
- não usar Smartlink, Direct Link, Popunder ou redirecionamentos automáticos;
- não inserir tags de anúncios no HTML global;
- limitar os formatos a Social Bar e um Native Banner;
- revisar campanhas no painel Adsterra e pausar a zona se aparecer cassino, apostas, golpes, conteúdo adulto ou notificações enganosas;
- se a rede não oferecer controle suficiente de categorias, remover o formato novamente.

Os scripts são carregados client-side somente nos pontos acima. A rede de anúncios continua sendo responsável pelo conteúdo entregue; o código do DecidlyAI não controla o criativo ou o destino de cada campanha.
