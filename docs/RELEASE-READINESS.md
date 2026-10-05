# Checklist de prontidão do DecidlyAI

Última auditoria: **5 de outubro de 2026**.

Projeto Supabase verificado: `decidlyai-production` (`bwnnfcgwwuvfikquqelq`), região `sa-east-1`.

## Resumo executivo

A geração de imagem visual por IA está **temporariamente desativada por segurança**. O endpoint público keyless do Pollinations serve Sana e não oferece uma garantia suficiente de moderação do resultado. O backend de produção agora falha fechado: não chama o provedor, não reserva créditos e não grava arquivos. PDF e Imagem de texto continuam disponíveis.

## Estado de produção

| Área | Estado | Observação |
|---|---|---|
| Workspace, autenticação e chat | Implementado | A evolução de preferências e workspace está no commit `6624785` da branch `main`; a publicação no host Lovable ainda depende de acesso autenticado ao painel. |
| Imagem por IA | Suspensa | Item visível, mas desativado no “+”; ação antiga também é bloqueada. Não reativar até escolher e validar uma rota com moderação apropriada. |
| Edge Function `generate-ai-image` | Suspensa no backend | Versão **5**, `verify_jwt=true`; retorna 503 após autenticar, sem RPC de reserva, chamada a modelo ou upload. |
| PDF | Ativo | PDF A4 simples, até 12.000 caracteres/8 páginas; 1 crédito pelo arquivo + uso normal da resposta; limite 1/dia Free e 3/dia VIP. |
| Imagem de texto | Ativa | PNG 1024×1024, até 220 caracteres; 0,5 crédito; limite 5/dia Free e 15/dia VIP. |
| Storage | Ativo | Bucket privado, caminhos por usuário, URLs assinadas temporárias e limite de 10 MiB. |
| Compra de créditos | Backend conectado; teste de ponta a ponta pendente | Checkout Pix AbacatePay e webhook estão ativos no Supabase; confirmação com credenciais/teste de pagamento da AbacatePay não foi executada nesta sessão. |

## Motivo da suspensão

A saída do modelo público Sana ficou sexualizada apesar de o pedido apresentado no chat não solicitar conteúdo sexual. O catálogo legado consultado lista somente Sana; o parâmetro `safe=true` ser reconhecido não comprova que o resultado seja moderado. A API atual do Pollinations tem opções de segurança mais explícitas, mas exige autenticação. Até haver uma escolha deliberada e uma validação adequada, a geração permanece bloqueada.

Fontes consultadas: [catálogo legado](https://image.pollinations.ai/models), [documentação de segurança Pollinations](https://github.com/pollinations/pollinations/blob/main/gen.pollinations.ai/src/docs/safety.md) e [relato de segurança no repositório oficial](https://github.com/pollinations/pollinations/issues/6600).

## Validação e publicação

- `pnpm build`, `git diff --check` e parse/transpile das sete Edge Functions alteradas passaram.
- A migration `20261005174123_personal_preferences_and_abacatepay_hardening` consta no banco de produção; RLS está ativo em preferências, pagamentos e feedback.
- Edge Functions de checkout, webhook, roteamento Free, provedor Groq, fallback Cloudflare, stream principal e VIP foram implantadas com JWT conforme esperado (webhook sem JWT e autenticado pelo segredo/assinatura).
- Smoke tests sem pagamento: webhook rejeitou segredo incorreto (401), recusou método GET (405) e checkout rejeitou JWT inválido (401). Nenhum checkout real foi criado.
- `pnpm lint` continua falhando: 2.177 problemas ESLint/Prettier no conjunto do repositório; build e análise sintática passaram.
- O commit `6624785` está em `main`, mas `decidlyai.lovable.app` ainda serve a versão anterior. Não há workflow de GitHub Actions nem credencial Cloudflare disponível para deploy por CLI; o painel Lovable solicita login.
- Artefatos anteriores não foram apagados; continuam privados no Storage e no histórico até pedido explícito de remoção.

## Secrets

Nenhuma chave de geração de imagem é exigida no frontend. O endpoint suspenso não precisa de segredo do provedor. `SUPABASE_SERVICE_ROLE_KEY` não é usado pela versão 5.

## Configuração necessária da AbacatePay

- Segredos de runtime necessários no Supabase: `ABACATEPAY_API_KEY` e `ABACATEPAY_WEBHOOK_SECRET`; `ABACATEPAY_PUBLIC_KEY` é usada para conferir a assinatura quando fornecida pela AbacatePay.
- Registrar o callback HTTPS para `checkout.completed` apontando para `https://bwnnfcgwwuvfikquqelq.supabase.co/functions/v1/abacate-webhook?webhookSecret=<segredo-configurado>`; não publicar o valor do segredo em documentação ou frontend.
- A função aplica crédito apenas após pagamento confirmado, preço de R$ 1,90, usuário/metadata validado e evento idempotente. O fluxo positivo Pix ainda precisa ser exercitado com credenciais de teste válidas.
