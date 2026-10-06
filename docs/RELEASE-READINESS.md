# Checklist de prontidão do DecidlyAI

Última auditoria: **5 de outubro de 2026**.

Projeto Supabase verificado: `decidlyai-production` (`bwnnfcgwwuvfikquqelq`), região `sa-east-1`.

## Resumo executivo

A geração de imagem visual por IA está **temporariamente desativada por segurança**. O endpoint público keyless do Pollinations serve Sana e não oferece uma garantia suficiente de moderação do resultado. O backend de produção agora falha fechado: não chama o provedor, não reserva créditos e não grava arquivos. PDF e Imagem de texto continuam disponíveis.

## Estado de produção

| Área | Estado | Observação |
|---|---|---|
| Workspace, autenticação e chat | Publicado | A evolução de preferências e workspace está no commit `6624785` da branch `main`; o usuário confirmou que o frontend está funcionando no host Lovable em 6 de outubro de 2026. |
| Imagem por IA | Suspensa | Item visível, mas desativado no “+”; ação antiga também é bloqueada. Não reativar até escolher e validar uma rota com moderação apropriada. |
| Edge Function `generate-ai-image` | Suspensa no backend | Versão **5**, `verify_jwt=true`; retorna 503 após autenticar, sem RPC de reserva, chamada a modelo ou upload. |
| PDF | Ativo | PDF A4 simples, até 12.000 caracteres/8 páginas; 1 crédito pelo arquivo + uso normal da resposta; limite 1/dia Free e 3/dia VIP. |
| Imagem de texto | Ativa | PNG 1024×1024, até 220 caracteres; 0,5 crédito; limite 5/dia Free e 15/dia VIP. |
| Storage | Ativo | Bucket privado, caminhos por usuário, URLs assinadas temporárias e limite de 10 MiB. |
| Compra de créditos | Bloqueado por configuração do webhook | O usuário confirmou pagamento em Sandbox; entrega `checkout.completed` respondeu `401 Unauthorized`. `abacate-webhook` v9 está publicada, mas é necessário alinhar `ABACATEPAY_WEBHOOK_SECRET` com o campo Secret do webhook e reenviar o evento. |

## Motivo da suspensão

A saída do modelo público Sana ficou sexualizada apesar de o pedido apresentado no chat não solicitar conteúdo sexual. O catálogo legado consultado lista somente Sana; o parâmetro `safe=true` ser reconhecido não comprova que o resultado seja moderado. A API atual do Pollinations tem opções de segurança mais explícitas, mas exige autenticação. Até haver uma escolha deliberada e uma validação adequada, a geração permanece bloqueada.

Fontes consultadas: [catálogo legado](https://image.pollinations.ai/models), [documentação de segurança Pollinations](https://github.com/pollinations/pollinations/blob/main/gen.pollinations.ai/src/docs/safety.md) e [relato de segurança no repositório oficial](https://github.com/pollinations/pollinations/issues/6600).

## Validação e publicação

- `pnpm build`, `git diff --check` e parse/transpile das sete Edge Functions alteradas passaram.
- A migration `20261005174123_personal_preferences_and_abacatepay_hardening` consta no banco de produção; RLS está ativo em preferências, pagamentos e feedback.
- Edge Functions de checkout, roteamento Free, provedor Groq, fallback Cloudflare, stream principal e VIP foram implantadas com JWT conforme esperado; `abacate-webhook` está na versão 9, sem JWT e autenticada pelo segredo/assinatura.
- Smoke tests anteriores à v9 sem pagamento confirmaram 401 para segredo incorreto, 405 para GET e 401 para checkout sem JWT. O payload real fornecido em Sandbox omitia `id` na raiz; a v9 usa o ID estável do checkout como fallback e preserva idempotência por `externalId`.
- `pnpm lint` continua falhando: 2.177 problemas ESLint/Prettier no conjunto do repositório; build e análise sintática passaram.
- O commit `6624785` está em `main`; o usuário confirmou que o frontend está funcionando no domínio Lovable. A publicação foi relatada pelo usuário e não foi revalidada independentemente nesta rodada.
- Artefatos anteriores não foram apagados; continuam privados no Storage e no histórico até pedido explícito de remoção.

## Secrets

Nenhuma chave de geração de imagem é exigida no frontend. O endpoint suspenso não precisa de segredo do provedor. `SUPABASE_SERVICE_ROLE_KEY` não é usado pela versão 5.

## Configuração necessária da AbacatePay

- Segredos de runtime necessários no Supabase: `ABACATEPAY_API_KEY`, `ABACATEPAY_WEBHOOK_SECRET` e `ABACATEPAY_PUBLIC_KEY` (HMAC).
- No webhook de Sandbox da AbacatePay, cadastrar o endpoint base `https://bwnnfcgwwuvfikquqelq.supabase.co/functions/v1/abacate-webhook`, selecionar `checkout.completed` e preencher o campo `Secret` com o mesmo valor de `ABACATEPAY_WEBHOOK_SECRET`; a AbacatePay envia esse valor na query `webhookSecret`. Não publicar o segredo em documentação ou frontend.
- A função aplica crédito apenas após pagamento confirmado, preço de R$ 1,90, usuário/metadata validado e evento idempotente. O fluxo positivo Pix ainda precisa ser exercitado com credenciais de teste válidas.
- Uma entrega com resposta `401 Unauthorized` indica secret ausente/divergente. Depois de alinhar os secrets no Supabase e no painel AbacatePay, reenviar manualmente o evento pago; não pedir novo pagamento.
