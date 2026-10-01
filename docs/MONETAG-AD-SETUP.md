# Configuração atual de anúncios do DecidlyAI

## Zonas ativas

- **Adsterra Banner**, selecionado entre zonas fornecidas pelo publisher: `728×90` (`96c171164990377ba9d624d04a3b4661`), `300×250` (`0aca9c0b2c938bb6bb53743898fe773e`) ou `320×50` (`22b5e40106fd1d27fef246e09217fecc`). As zonas são montadas em `/credits` (depois do saldo), `/credits/free` (entre saldo e indicação), `/credits/history` (antes da lista), `/blog` (entre os posts), `/tecnologia` (após a explicação da rota), `/como-funciona` (no meio do conteúdo), na home (depois de Planos e antes das dúvidas frequentes) e em `/referral-history` somente quando o histórico está vazio.
- **Sem banner em `/credits/buy`**: não exibir publicidade na página de compra de créditos.
- **Adsterra Social Bar**, montado apenas no workspace.

## Experiência e controles

- O Social Bar espera 90 segundos (1 minuto e 30 segundos) com a aba visível e sem foco em um campo de texto; se a aba ficar em segundo plano, o tempo recomeça. O script é injetado no máximo uma vez por sessão da aba. A frequência recorrente deve ser gerida pela configuração da Adsterra.
- Os banners carregam quando o espaço se aproxima da área visível. Enquanto carrega, o frame reserva apenas a altura do formato selecionado; depois, acompanha o criativo recebido.
- Info e reroll ficam sobre o topo do anúncio. Em criativos menores, aparecem só como ícones; rótulos curtos são exibidos apenas quando a largura medida do criativo permite. O atalho VIP fica no canto inferior direito e reduz-se ao ícone em formatos pequenos.
- É possível fazer **uma** nova tentativa manual por espaço, somente quando pelo menos 50% do banner estiver visível. A tentativa reinjeta o código da zona; a rede pode não preencher o espaço ou pode retornar o mesmo criativo. O componente não adiciona atualização automática e não promete outro anúncio.
- Um teste do banner publicado em `/como-funciona` registrou a segunda requisição ao `invoke.js`, mas nenhum criativo foi inserido. O componente mostra “Sem outro anúncio” após o tempo limite. Para uma troca garantida, solicitar à Adsterra um método/código oficial de refresh e validar a configuração da zona.
- O botão de informações identifica o provedor e exibe a URL de destino somente quando o criativo a expõe à página. Em `iframe` isolado, a página não consegue ler o destino interno.
- O botão VIP leva a `/vip`, uma página informativa “Em breve”. Não há preço, checkout ou compra habilitada neste momento.

## Tamanhos e responsividade

O componente escolhe uma zona pela largura real disponível ao montar o espaço: `728×90` a partir de 728 px; `300×250` entre 468–727 px (e 300–319 px); `320×50` entre 320–467 px. O `320×50` pode ocupar 320 px centrados no viewport do celular, sem criar a faixa alta do fallback. A escolha é feita uma vez por montagem; resize não dispara refresh automático.

O publisher também forneceu `160×300` (`c7472a11c92c4f0f46847786e98bb26a`) e `160×600` (`39622a664c5a3450388606e74ac02d84`), mas eles não são carregados no conteúdo central: ficam reservados para uma coluna lateral, ainda inexistente. O painel mostra também `468×60`; falta o snippet dessa zona para habilitar esse tamanho. Não duplicar o mesmo código da zona no mesmo espaço/página; o tamanho vem da zona Adsterra, não de redimensionar o conteúdo de um `iframe` por CSS.

Bloqueios de apostas, cassinos, conteúdo adulto e outras categorias são configurações da zona/conta da Adsterra; o componente visual não filtra nem garante quais anúncios a rede serve. A confirmação desses bloqueios deve vir da Adsterra.

## Referências oficiais da Adsterra

- [How to Make Money with Banner Ads](https://adsterra.com/blog/how-banner-ads-make-money/): tamanhos disponíveis, códigos de publisher, banners não responsivos e aviso contra repetir o mesmo código.
- [How Adsterra Counts Ad Impressions](https://adsterra.com/blog/adsterra-ad-impressions/): carregamento completo e visibilidade do criativo.
- [Publisher’s Guide to Social Bar](https://adsterra.com/blog/publishers-guide-to-social-bar/): frequência e instalação do Social Bar.
