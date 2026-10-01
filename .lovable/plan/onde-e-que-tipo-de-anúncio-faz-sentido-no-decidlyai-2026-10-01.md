# Onde e que tipo de anúncio faz sentido no DecidlyAI

## Recomendação em resumo

- Manter o workspace visualmente limpo: só o Social Bar que já existe, com a espera de 90 segundos. Nada de banner dentro da conversa.
- Concentrar anúncios nas páginas de créditos (`/credits/free`, `/credits/history`, `/credits/buy`) e nas páginas de conteúdo (`/blog`, `/como-funciona`, `/tecnologia`), onde o usuário espera ou lê e o produto não é interrompido.
- Na home, um único banner abaixo da dobra (depois de “Planos”, antes do rodapé) — nunca no topo, que é onde a pessoa decide criar conta.
- Formato principal: banner responsivo + Social Bar no estilo notificação/in-page push, porque 84% do tráfego é celular.
- Popunder e intersticial ficam adiados: pagam mais, mas castigam exatamente o que o DecidlyAI precisa (tempo de sessão e retorno).

## Como o site está hoje (verificado)

- Uma zona de banner Adsterra (`0808b976d18733b256b1229ba2178907`) montada em `/credits` e `/como-funciona`.
- Social Bar montado apenas no workspace, com espera de 90 s, uma injeção por aba.
- O espaço do banner já é responsivo (até 728 px), tem carregamento por visibilidade, botão de informação, uma troca manual e fallback próprio.
- `/vip` é página informativa “Em breve”: ainda não existe compra do plano sem anúncios.
- `/credits/buy` mostra pacotes, mas o checkout ainda não está ligado a um provedor de pagamento.
- Tráfego dos últimos 30 dias: cerca de 120 visitantes e 882 visualizações (pico de 16 visitantes num dia). Páginas mais vistas: `/` (90), `/workspace` (53), `/login` (52), `/credits` (22), `/credits/free` (15), `/credits/history` (12), `/credits/buy` (8), `/ai-test` (8), `/settings` (8). Aparelhos: 101 celular contra 19 computador. Países: Brasil (90) e Estados Unidos (20).

## Mapa de colocações

```text
Rota               Tipo                     Prioridade  Motivo
/credits           banner (já ativo)        alta        intenção de ganhar/comprar, retorno frequente
/credits/free      banner                   alta        página de espera, sem risco ao produto
/credits/history   banner                   média       visita recorrente, pouca atenção disputada
/credits/buy       banner                   média       mesmo cluster, sem atrapalhar decisão
/blog              banner entre os posts    alta        leitura = tempo em página, bom para CPM
/tecnologia        banner no fim            média       conteúdo técnico, usuário lê até o fim
/como-funciona     banner (já ativo)        —           mantém como está
/                  banner após #planos      média       abaixo da dobra, não compete com o cadastro
/referral-history  banner no vazio          baixa       só quando a lista estiver vazia
/workspace         Social Bar (já ativo)    —           manter, sem banner na conversa
/login             NENHUM                   —           caminho de conversão
/reset-password    NENHUM                   —           recuperação de conta
/privacy /terms    NENHUM                   —           páginas legais
/cookies           NENHUM                   —           preferências do visitante
/ai-test           NENHUM                   —           rota interna de teste
/settings          NENHUM por ora           —           área de conta, pouco volume
```

## Tipos de anúncio: usar e evitar

Usar:

- **Banner responsivo** (o que já existe): fácil de integrar e previsível. Adsterra recomenda header, fim do conteúdo e abaixo do artigo, e alerta para o risco de “cegueira de banner” quando há unidades demais.
- **Social Bar no modo in-page push / notificação**: formato da Adsterra que não bloqueia o conteúdo e funciona em todos os sistemas e navegadores, inclusive iOS. É o que mais combina com um site quase todo em celular.
- **Um formato por cluster de páginas**, sempre com o mesmo componente, para não duplicar códigos na mesma tela.

Evitar agora:

- **Popunder**: a própria Adsterra aponta que o uso abusivo reduz o tempo de sessão, o que neste produto significa menos mensagens e menos chance de voltar.
- **Intersticial em tela cheia**: interrompe a conversa no momento em que a pessoa está decidindo algo importante.
- **Direct Link (SmartLink) em botão do produto**: um botão de “Nova decisão” ou “Enviar” que leva a anúncio destrói a confiança no DecidlyAI. Se um dia usar, que seja em um link claramente rotulado como apoio/patrocínio, fora das ações principais.
- **Dois ou mais banners na mesma tela**: densidade alta derruba o CPM e aumenta clique acidental.

## Regras de proteção da experiência

- Máximo de uma unidade de display por página, mais o Social Bar do workspace.
- Nunca encostar o anúncio na caixa de mensagem, nos botões de envio ou em CTAs: distância e rótulo “Anúncio” claros.
- Manter os controles que já existem: identificação do provedor, botão de informação, uma troca manual por espaço e o atalho “Remover anúncios”.
- Bloqueios de categoria (apostas, cassinos, adulto) continuam sendo ajustados na zona/conta da Adsterra e precisam de confirmação por escrito do gerente.
- Frequência e repetição do Social Bar seguem sendo combinadas com o gerente da Adsterra, não com código extra.

## Leitura honesta sobre o ganho

Com cerca de 900 visualizações por mês, algumas unidades a mais mudam o valor recebido em centavos, não em reais. A Adsterra mesma diz que o pagamento depende de volume, nicho e concorrência pela audiência, e que publishers iniciantes costumam começar com valores baixos mesmo com tráfego bem maior.

A ordem de retorno, hoje, é:

1. Mais visitas certas (o site tem ~4 visitantes por dia).
2. Checkout de créditos funcionando e a opção “sem anúncios” real, que é o que transforma incômodo em receita.
3. Anúncios bem colocados, que é o que este plano organiza.

## O que eu mudaria no código, se aprovar

- `src/routes/credit-pages.tsx`: importar e montar `AdsterraNativeBanner` no fim de `FreePage`, `HistoryPage` e `BuyPage`, reutilizando o mesmo componente e a mesma zona.
- `src/routes/blog.tsx`: um banner entre os posts, com espaçamento próprio para não parecer parte do conteúdo.
- `src/routes/tecnologia.tsx`: banner no fim da página.
- `src/routes/index.tsx`: banner depois da seção `#planos`, antes do `Footer`, sem mexer no hero nem nos CTAs.
- `src/routes/referral-history.tsx`: banner apenas no estado “nenhum convite registrado”.
- `src/styles.css`: espaçamento e rótulo discreto “Anúncio” quando o criativo carregar.
- `docs/MONETAG-AD-SETUP.md`: atualizar a lista de zonas ativas.

Nada disso toca `/login`, `/reset-password`, `/workspace` (além do Social Bar atual), `/privacy`, `/terms` ou `/cookies`.

## Referências

- [Ad Placement Strategies](https://adsterra.com/blog/ad-placement-strategies/) — colocações por formato e riscos de densidade.
- [Essential Ad Formats for Publishers 2026](https://adsterra.com/blog/quick-publishers-manual-to-ad-formats/) — popunder, Social Bar, intersticial, banner, native e SmartLink com prós e contras.
- [Social Bar Monetization Guide](https://adsterra.com/blog/publishers-guide-to-social-bar/) — comportamento do formato e orientação de não duplicar códigos.
- [How Much Does Adsterra Pay](https://adsterra.com/blog/how-much-adsterra-pays/) — pagamento atrelado a volume, nicho e concorrência.
