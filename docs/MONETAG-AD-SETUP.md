# Configuração atual de anúncios do DecidlyAI

## Zonas ativas

- **Adsterra Banner**, zona `0808b976d18733b256b1229ba2178907`: usado nos espaços de Publicidade de `/credits` e `/como-funciona`.
- **Adsterra Social Bar**: carregado no workspace depois de 8 segundos, no máximo uma vez por sessão.

O slot de banner anterior do NewClick foi removido dessas páginas. Os antigos formatos Monetag, Popunder, Direct Link, Smartlink e anúncio recompensado também não são usados.

## Banner responsivo

O script Adsterra é carregado de forma assíncrona e apenas enquanto o slot da página está montado. O espaço ocupa até 728 px no desktop e acompanha a largura disponível em telas menores; imagens e iframes injetados ficam limitados à largura do espaço. Não é fixada uma altura de criativo: o conteúdo pode determinar a altura final. O criativo VIP próprio aparece enquanto a rede ainda não inseriu um anúncio.

O CSS evita que o elemento injetado ultrapasse horizontalmente o layout, mas não consegue redimensionar o conteúdo interno de um iframe entre domínios. Para formatos que mudam de tamanho por dispositivo, a própria zona também precisa estar configurada como responsiva no painel da Adsterra.

## Filtros de conteúdo

Bloqueios de apostas, cassinos, conteúdo adulto e outras categorias são configurações da zona/conta da Adsterra; o componente visual não filtra nem garante quais anúncios a rede vai servir. A confirmação desses bloqueios deve vir da Adsterra. Se a zona continuar exibindo categorias que deveriam estar bloqueadas, ela deve ser pausada no painel enquanto o suporte investiga.
