# Configuração atual de anúncios do DecidlyAI

## Zonas ativas

- **Adsterra Banner**, zona `0808b976d18733b256b1229ba2178907`, nos espaços de `/credits` e `/como-funciona`.
- **Adsterra Social Bar**, montado apenas no workspace.

## Experiência e controles

- O Social Bar espera 15 segundos com a aba visível e sem foco em um campo de texto; se a aba ficar em segundo plano, o tempo recomeça. O script é injetado no máximo uma vez por sessão da aba. A frequência de exibição recorrente do formato deve continuar sendo gerida no painel/por meio do gerente da Adsterra, não adicionando códigos duplicados.
- Os banners são carregados quando o espaço se aproxima da área visível. Os controles ficam fora da área do criativo para reduzir cliques acidentais. Não há atualização automática do banner.
- O visitante pode solicitar **uma** nova tentativa manual por espaço montado, somente quando o banner estiver pelo menos 50% visível. A rede escolhe o próximo criativo e pode não fornecer outro anúncio.
- O botão de informações identifica o provedor e exibe a URL do destino somente quando o script a expõe como um link na página. Em criativos isolados em `iframe`, a página não consegue ler o destino interno; nesse caso a interface informa a limitação, sem apresentar a URL do script como se fosse a URL do anunciante.
- O botão VIP leva a `/vip`, uma página informativa “Em breve”. Não há preço, checkout ou compra habilitada nesse momento.

## Responsividade e filtros

O espaço do banner ocupa até 728 px no desktop e acompanha a largura disponível em telas menores; imagens e iframes injetados ficam limitados à largura do espaço. A página não consegue redimensionar o conteúdo interno de um iframe entre domínios. Para criativos responsivos, a própria zona também precisa estar configurada assim no painel da Adsterra.

Bloqueios de apostas, cassinos, conteúdo adulto e outras categorias são configurações da zona/conta da Adsterra; o componente visual não filtra nem garante quais anúncios a rede vai servir. A confirmação desses bloqueios deve vir da Adsterra.

## Referências oficiais da Adsterra

- [Publisher’s Guide to Social Bar](https://adsterra.com/blog/publishers-guide-to-social-bar/): orienta a gerir frequência com o gerente e evitar vários códigos do Social Bar na mesma página.
- [Ad Placement Strategies](https://adsterra.com/blog/ad-placement-strategies/): recomenda refresh dinâmico do banner quando estiver visível; o componente não faz auto-refresh.
- [How Adsterra Counts Ad Impressions](https://adsterra.com/blog/adsterra-ad-impressions/): descreve a contagem de impressões a partir de carregamentos completos e visibilidade do criativo.
- [Ad Placement Mistakes](https://adsterra.com/blog/ad-placement-mistakes-that-lead-to-cpm-drop/): recomenda evitar sobreposição, alta densidade e cliques acidentais.
