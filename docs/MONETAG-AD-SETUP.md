# Configuração atual de anúncios do DecidlyAI

## Zonas ativas

- **Adsterra Banner**, zona `0808b976d18733b256b1229ba2178907`, montada em `/credits` (depois do saldo), `/credits/free` (entre saldo e indicação), `/credits/history` (antes da lista), `/blog` (entre os posts), `/tecnologia` (após a explicação da rota), `/como-funciona` (no meio do conteúdo), na home (depois de Planos e antes das dúvidas frequentes) e em `/referral-history` somente quando o histórico está vazio.
- **Sem banner em `/credits/buy`**: não exibir publicidade na página de compra de créditos.
- **Adsterra Social Bar**, montado apenas no workspace.

## Experiência e controles

- O Social Bar espera 90 segundos (1 minuto e 30 segundos) com a aba visível e sem foco em um campo de texto; se a aba ficar em segundo plano, o tempo recomeça. O script é injetado no máximo uma vez por sessão da aba. A frequência recorrente deve ser gerida pela configuração da Adsterra.
- Os banners carregam quando o espaço se aproxima da área visível. O frame acompanha a dimensão real do criativo, sem altura mínima artificial depois do carregamento.
- Info e reroll ficam sobre o topo do anúncio. Em criativos menores, aparecem só como ícones; rótulos curtos são exibidos apenas quando a largura medida do criativo permite. O atalho VIP fica no canto inferior direito e reduz-se ao ícone em formatos pequenos.
- É possível fazer **uma** nova tentativa manual por espaço, somente quando pelo menos 50% do banner estiver visível. A tentativa reinjeta o código da zona; a rede pode não preencher o espaço ou pode retornar o mesmo criativo. O componente não adiciona atualização automática e não promete outro anúncio.
- Um teste do banner publicado em `/como-funciona` registrou a segunda requisição ao `invoke.js`, mas nenhum criativo foi inserido. O componente mostra “Sem outro anúncio” após o tempo limite. Para uma troca garantida, solicitar à Adsterra um método/código oficial de refresh e validar a configuração da zona.
- O botão de informações identifica o provedor e exibe a URL de destino somente quando o criativo a expõe à página. Em `iframe` isolado, a página não consegue ler o destino interno.
- O botão VIP leva a `/vip`, uma página informativa “Em breve”. Não há preço, checkout ou compra habilitada neste momento.

## Tamanhos e responsividade

A zona/código Adsterra define o tamanho do criativo e os banners não mudam automaticamente de formato por CSS. O material oficial lista, entre outros, 320×50, 300×250, 468×60, 728×90, 160×300 e 160×600. Para oferecer vários formatos, pedir e configurar uma zona/código próprio para cada tamanho e selecionar o formato adequado por breakpoint. Não duplicar o mesmo código da zona no mesmo espaço/página; a documentação da Adsterra alerta que isso pode distorcer estatísticas e CPM. O CSS limita a largura ao espaço disponível, mas não consegue redimensionar o conteúdo interno de um `iframe` de outro domínio.

Bloqueios de apostas, cassinos, conteúdo adulto e outras categorias são configurações da zona/conta da Adsterra; o componente visual não filtra nem garante quais anúncios a rede serve. A confirmação desses bloqueios deve vir da Adsterra.

## Referências oficiais da Adsterra

- [How to Make Money with Banner Ads](https://adsterra.com/blog/how-banner-ads-make-money/): tamanhos disponíveis, códigos de publisher, banners não responsivos e aviso contra repetir o mesmo código.
- [How Adsterra Counts Ad Impressions](https://adsterra.com/blog/adsterra-ad-impressions/): carregamento completo e visibilidade do criativo.
- [Publisher’s Guide to Social Bar](https://adsterra.com/blog/publishers-guide-to-social-bar/): frequência e instalação do Social Bar.
