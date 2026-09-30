# Configuração de anúncios Monetag

## Estado atual

Os formatos Monetag estão **pausados no site** até confirmar no painel um bloqueio efetivo para cassino, apostas e campanhas de PIX. O código dos componentes permanece preparado, mas nenhum tag Monetag é montado nas rotas públicas neste momento.

## Formatos preparados

- **Vignette Banner**, zona `11926416`, script `https://n6wxm.com/vignette.min.js`.
- **Direct Link**, URL `https://omg10.com/4/11926418`, usado apenas como botão claramente identificado na carteira de créditos, sem promessa de recompensa.
- **Popunder/Onclick**, zona `11926415`, script `https://nap5k.com/tag.min.js`: não incluído.

## Posicionamento

- Vignette: preparado para `/credits`, `/credits/free` e `/credits/buy`, atualmente desativado.
- Direct Link: preparado para uso opcional e claramente identificado, atualmente desativado.
- Workspace, login, cadastro, configurações e chat: sem anúncios.

## Limites de experiência

- Vignette carregado no máximo uma vez por sessão usando `sessionStorage`.
- Nenhum anúncio é carregado no campo de conversa ou durante a geração da IA.
- O Direct Link abre em nova aba e é marcado com `rel="nofollow sponsored noopener noreferrer"`.
- Adult ads devem permanecer desativados no painel Monetag.

## Regra de recompensa

A página de recompensa não usa o Direct Link nem atribui créditos a cliques, impressões ou visitas a anúncios Monetag. A Monetag declara que tráfego e cliques incentivados não são aceitos. Qualquer programa de créditos patrocinados precisa usar uma oferta/rede que autorize explicitamente recompensas e seus postbacks; não deve ser associado a um tag Monetag comum.

Fontes oficiais consultadas:
- https://help.monetag.com/en/articles/6725606-vignette-banners
- https://monetag.com/formats/in-page-push-ads/
- https://monetag.com/blog/ad-monetization/
