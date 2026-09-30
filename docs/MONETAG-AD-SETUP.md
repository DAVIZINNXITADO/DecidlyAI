# Política atual de anúncios do DecidlyAI

## Provedores ativos

- **NewClick**, website ID `13525`: único Native Banner usado em `/credits` e `/como-funciona`.
- **Adsterra Social Bar**: carregado pela raiz da aplicação uma única vez por atualização completa da página, após 8 segundos.

## Native Banner

O mesmo bloco NewClick é usado nas páginas de créditos e Como funciona. Não há rotação entre provedores e não há dois scripts disputando o mesmo espaço.

O banner VIP do DecidlyAI fica atrás do slot como fallback visual. Se o NewClick carregar, ele ocupa o slot; se atrasar ou falhar, a publicidade padrão VIP continua visível.

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
