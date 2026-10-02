# Checklist de prontidão do DecidlyAI

Última auditoria: **20 de setembro de 2026**.

Este documento separa funcionalidades implementadas no código, funcionalidades que dependem de configuração externa e pontos que ainda não devem ser considerados prontos para produção.

## Resumo executivo

O workspace, autenticação, conversas, streaming, fallback gratuito, resposta rica segura, perguntas contextuais, central compacta de ferramentas, créditos e páginas institucionais já estão presentes no projeto. Pagamentos ainda estão apenas com a tela de pacotes; não existe checkout real conectado. A monetização por anúncios usa somente formatos display padrão do Adsterra nas posições editoriais e de apoio descritas em `MONETAG-AD-SETUP.md`; não há anúncios recompensados nem créditos concedidos por visualização de anúncio.

## O que está implementado

| Área | Estado | Observação |
|---|---|---|
| Aplicação React/TanStack Start | Completo | Estrutura principal, rotas, layout e build configurados. |
| Login e sessão | Implementado | Supabase Auth é usado pelo frontend e pelas Edge Functions. |
| Workspace | Implementado | Conversas, histórico, criação de conversa, mensagens e navegação lateral. |
| Streaming | Implementado | Streaming SSE com atualização progressiva e cancelamento da geração. |
| Rota Free | Implementado | `decidly-ai-stream` consulta créditos e encaminha para `free-ai-router`, que tenta provedores em fallback. |
| Rota VIP | Parcial | Existe seleção de função para VIP, mas o caminho precisa ser revisado antes de ser tratado como rota VIP isolada em produção. |
| Estados de processamento | Implementado | Enviando, pensando e mensagens de processamento com tempo decorrido. |
| Perguntas contextuais | Implementado no contrato/UI | A IA pode emitir `[question]`; a pergunta aparece sem bloquear a caixa de mensagem. |
| Respostas ricas | Implementado | Markdown seguro e blocos semânticos renderizados pelo frontend. |
| Vantagens e desvantagens | Implementado | Callouts `advantage` e `disadvantage`. |
| Marcações personalizadas | Implementado | Destaques com variantes controladas pelo renderer. Não há HTML/CSS arbitrário. |
| Blocos copiáveis | Implementado | Botão de cópia para texto, comando, código e templates. |
| Links externos | Implementado | Cartão clicável com aviso visual de site externo. |
| Autorização antes de ações | Implementado no protocolo/UI | A IA pode pedir permissão para criar imagem, PDF ou arquivo; a execução efetiva das ferramentas ainda precisa ser conectada. |
| Central do botão “+” | Implementado | Popup compacto com pesquisa, criação, plugins futuros e anexos. |
| Upload real | Parcial | O seletor de arquivos funciona e registra nomes no contexto; processamento/storage ainda não está conectado. |
| PDF | Parcial | Existem opções e protocolo; leitura/criação real ainda requer Edge Functions e storage. |
| Créditos e carteira | Implementado | Saldo, créditos diários, gratuitos, comprados e histórico visual. |
| Custos por operação | Preparado | Existe motor inicial de estimativa e migration de ledger; ainda precisa ser ligado a reservas/ajustes reais no backend. |
| Indicações | Implementado | Código, campanha e recompensa aparecem no workspace/créditos. |
| Anúncios recompensados | Fora de escopo | Não oferecer visualizações de anúncio em troca de créditos. Migration preparada para revogar as RPCs legadas sem apagar registros existentes; ainda precisa ser aplicada ao ambiente. |
| Compra de créditos | Não conectado | A tela exibe pacotes, mas o clique apenas mostra aviso de que o checkout será integrado. |
| Página institucional | Implementado | `/como-funciona` explica produto, ferramentas, autonomia e controle do usuário. |
| PWA | Preparado | Manifest, ícones e fluxo de instalação existem. |
| TTS | Implementado | Existe função de texto para voz e controles na resposta. |

## Pagamentos: o que falta configurar

A tela de compra já existe, mas não deve ser considerada pagamento funcional. Para ativar pagamentos com segurança, é necessário escolher um provedor e implementar:

1. Criar produtos/preços no provedor escolhido para os pacotes de créditos.
2. Criar uma Edge Function de checkout que valide o usuário e o pacote no servidor.
3. Redirecionar o usuário para o checkout hospedado pelo provedor.
4. Criar webhook autenticado para confirmar pagamento, evitando creditar pela resposta do navegador.
5. Fazer o webhook ser idempotente, gravando o `provider_payment_id` ou equivalente.
6. Creditar somente após evento confirmado como pago.
7. Registrar um evento positivo em `credit_events` e uma operação no ledger de créditos.
8. Configurar política de reembolso/chargeback e reversão de créditos.
9. Testar em modo sandbox antes de ativar produção.

Nenhuma chave secreta deve entrar no frontend ou no Git. As chaves devem ser configuradas como secrets das Edge Functions.

## Anúncios: escopo e pendências

O projeto mantém `public/ads.txt` e usa formatos display padrão da Adsterra nas posições descritas em `MONETAG-AD-SETUP.md`. Não oferecer anúncios recompensados nem usar visualização de anúncio para conceder créditos. Há anúncios em `/credits`, `/credits/free` e `/credits/history`; `/credits/buy` permanece sem anúncios.

O aviso de cookies agora está montado globalmente e os scripts Adsterra só carregam após aceite explícito de cookies não essenciais. Antes de produção, ainda é necessário confirmar a configuração do publisher/domínio e revisar consentimento e política de privacidade para as regiões atendidas; `ads.txt` ou o snippet não substituem essas verificações.

## Variáveis de configuração preparadas

As variáveis sugeridas estão no `.env.example`. Valores reais devem ser configurados no ambiente de deploy ou nos secrets do Supabase:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PAYMENT_PROVIDER`, apenas para identificar o provedor no frontend
- `VITE_PAYMENT_CHECKOUT_URL`, somente se for usado um checkout hospedado e público
- `PAYMENT_SECRET_KEY`, somente como secret server-side/Edge Function
- `PAYMENT_WEBHOOK_SECRET`, somente como secret server-side/Edge Function

## Critérios antes de abrir para produção

- [ ] Aplicar todas as migrations no Supabase.
- [ ] Fazer deploy das Edge Functions usadas pelo workspace.
- [ ] Aplicar a migration que revoga as RPCs legadas de recompensa patrocinada; ela preserva os registros existentes.
- [ ] Isolar e validar a rota VIP.
- [ ] Implementar checkout e webhook idempotente.
- [ ] Implementar processamento real de upload/PDF/storage.
- [ ] Testar limites, créditos insuficientes, duplicidade de webhook e cancelamento de streaming.
- [ ] Corrigir os erros TypeScript antigos existentes no projeto.
- [ ] Testar mobile, acessibilidade, links externos e estados offline.
- [ ] Testar aceite/recusa de cookies: aceitar carrega anúncios; recusar mantém todos os scripts Adsterra bloqueados.
- [ ] Revisar termos, privacidade, consentimento e política de anúncios.
