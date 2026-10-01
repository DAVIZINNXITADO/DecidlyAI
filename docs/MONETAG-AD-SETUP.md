# Configuração atual de anúncios do DecidlyAI

## Zonas ativas

- **Adsterra Banner** em páginas de conteúdo: formato horizontal `728×90` (`96c171164990377ba9d624d04a3b4661`) alinhado ao canto superior direito no desktop e `320×50` (`22b5e40106fd1d27fef246e09217fecc`) em telas estreitas. O quadrado `300×250` (`0aca9c0b2c938bb6bb53743898fe773e`) não é usado nesse posicionamento. Os slots ficam somente em `/blog`, `/tecnologia` e `/como-funciona`.
- **Sem banner em páginas funcionais**: carteira (`/credits`, `/credits/free`, `/credits/history`, `/credits/buy`), home e histórico de convites.
- **Adsterra Social Bar**, montado apenas no workspace.

## Experiência e controles

- O Social Bar espera 90 segundos (1 minuto e 30 segundos) com a aba visível e sem foco em um campo de texto; se a aba ficar em segundo plano, o tempo recomeça. O script é injetado no máximo uma vez por sessão da aba. A frequência recorrente deve ser gerida pela configuração da Adsterra.
- Os banners carregam quando o espaço se aproxima da área visível. No modo superior-direito, o desktop usa `728×90` quando o espaço comporta a zona; em larguras menores usa `320×50`. O criativo não é esticado; frame e criativo ficam alinhados à direita no desktop e centralizados em telas estreitas.
- Os controles ficam à direita dentro do frame, como ícones compactos de informação e VIP; em viewport móvel (até 639 px), ficam ocultos para não cobrir o criativo. A etiqueta “Anúncio” permanece visível, mas menor no celular.
- O reroll foi removido: repetir o mesmo `invoke.js` não é uma API oficial de troca e pode criar requisições/criativos duplicados. Não há refresh automático.
- O botão de informações identifica o provedor e exibe a URL de destino somente quando o criativo a expõe à página. Em `iframe` isolado, a página não consegue ler o destino interno. Os scripts da zona são inseridos dentro do slot para que o iframe gerado respeite o tamanho responsivo.
- O botão VIP leva a `/vip`, uma página informativa “Em breve”. Não há preço, checkout ou compra habilitada neste momento.

## Tamanhos e responsividade

No modo superior-direito, o componente escolhe `728×90` quando viewport e frame comportam 728 px; caso contrário escolhe `320×50` quando ambos comportam 320 px. A seleção padrão para outros posicionamentos ainda considera frame e viewport: `728×90` a partir de 728 px, `300×250` entre 468–727 px (e em viewport de 300–319 px), `320×50` entre 320–467 px. A escolha é feita uma vez por montagem; resize não dispara refresh automático.

O publisher também forneceu `160×300` (`c7472a11c92c4f0f46847786e98bb26a`) e `160×600` (`39622a664c5a3450388606e74ac02d84`), mas eles não são carregados no conteúdo central: ficam reservados para uma coluna lateral, ainda inexistente. O painel mostra também `468×60`; falta o snippet dessa zona para habilitar esse tamanho. Não duplicar o mesmo código da zona no mesmo espaço/página; o tamanho vem da zona Adsterra, não de redimensionar o conteúdo de um `iframe` por CSS.

Bloqueios de apostas, cassinos, conteúdo adulto e outras categorias são configurações da zona/conta da Adsterra; o componente visual não filtra nem garante quais anúncios a rede serve. A confirmação desses bloqueios deve vir da Adsterra.

## Referências oficiais da Adsterra

- [How to Make Money with Banner Ads](https://adsterra.com/blog/how-banner-ads-make-money/): tamanhos disponíveis, códigos de publisher, banners não responsivos e aviso contra repetir o mesmo código.
- [How Adsterra Counts Ad Impressions](https://adsterra.com/blog/adsterra-ad-impressions/): carregamento completo e visibilidade do criativo.
- [Publisher’s Guide to Social Bar](https://adsterra.com/blog/publishers-guide-to-social-bar/): frequência e instalação do Social Bar.
