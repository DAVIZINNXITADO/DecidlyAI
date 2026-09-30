# Política atual de anúncios do DecidlyAI

## Provedores ativos

- **NewClick**, website ID `13525`: único Native Banner usado em `/credits` e `/como-funciona`.
- **Adsterra Social Bar**: carregado pela raiz da aplicação uma única vez por atualização completa da página, após 8 segundos.

## Native Banner

O mesmo bloco NewClick é usado nas páginas de créditos e Como funciona. Não há rotação entre provedores e não há dois scripts disputando o mesmo espaço.

O componente valida a imagem retornada pela API e tenta até oito banners quando algum arquivo está indisponível. Enquanto procura uma imagem válida, mostra como fallback textual o `alt_text` e o link de clique fornecidos pelo próprio NewClick; quando uma imagem carrega, ela substitui o texto. O banner VIP do DecidlyAI permanece como fallback final somente se a API não fornecer nenhum banner utilizável.

## Social Bar

O Social Bar é montado no componente raiz. Uma atualização completa da página cria no máximo um script, depois de uma espera curta. Navegações internas não reinjetam outro Social Bar.

## Provedores removidos

- Monetag Vignette;
- Monetag Direct Link;
- Smartlink;
- Popunder;
- anúncio recompensado;
- rota de teste `/anuncio`.

Não há recompensa por impressão, visita ou clique em anúncio.
