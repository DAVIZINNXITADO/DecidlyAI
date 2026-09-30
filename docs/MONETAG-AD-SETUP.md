# Configuração de anúncios Monetag

## Formatos usados

- **Vignette Banner**, zona `11926416`, script `https://n6wxm.com/vignette.min.js`.
- **Direct Link**, URL `https://omg10.com/4/11926418`, usado apenas como botão claramente identificado.
- **Popunder/Onclick**, zona `11926415`, script `https://nap5k.com/tag.min.js`: não incluído.

## Posicionamento

- Vignette: `/credits`, `/credits/free` e `/credits/buy`.
- Direct Link: somente em `/anuncio`, com o rótulo `Conhecer patrocinador`.
- Workspace, login, cadastro, configurações e chat: sem anúncios.

## Limites de experiência

- Vignette carregado no máximo uma vez por sessão usando `sessionStorage`.
- Nenhum anúncio é carregado no campo de conversa ou durante a geração da IA.
- O Direct Link abre em nova aba e é marcado com `rel="nofollow sponsored noopener noreferrer"`.
- Adult ads devem permanecer desativados no painel Monetag.

Fontes oficiais consultadas:
- https://help.monetag.com/en/articles/6725606-vignette-banners
- https://monetag.com/formats/in-page-push-ads/
- https://monetag.com/blog/ad-monetization/
