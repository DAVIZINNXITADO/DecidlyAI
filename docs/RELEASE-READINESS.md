# Checklist de prontidão do DecidlyAI

Última auditoria: **4 de outubro de 2026**.

Projeto Supabase verificado: `decidlyai-production` (`bwnnfcgwwuvfikquqelq`), região `sa-east-1`.

## Resumo executivo

A geração de imagem visual por IA está **temporariamente desativada por segurança**. O endpoint público keyless do Pollinations serve Sana e não oferece uma garantia suficiente de moderação do resultado. O backend de produção agora falha fechado: não chama o provedor, não reserva créditos e não grava arquivos. PDF e Imagem de texto continuam disponíveis.

## Estado de produção

| Área | Estado | Observação |
|---|---|---|
| Workspace, autenticação e chat | Implementado | O código frontend na branch intercepta pedidos de Imagem por IA e informa a suspensão sem enviar a mensagem nem consumir créditos; a publicação do frontend não foi confirmada. |
| Imagem por IA | Suspensa | Item visível, mas desativado no “+”; ação antiga também é bloqueada. Não reativar até escolher e validar uma rota com moderação apropriada. |
| Edge Function `generate-ai-image` | Suspensa no backend | Versão **5**, `verify_jwt=true`; retorna 503 após autenticar, sem RPC de reserva, chamada a modelo ou upload. |
| PDF | Ativo | PDF A4 simples, até 12.000 caracteres/8 páginas; 1 crédito pelo arquivo + uso normal da resposta; limite 1/dia Free e 3/dia VIP. |
| Imagem de texto | Ativa | PNG 1024×1024, até 220 caracteres; 0,5 crédito; limite 5/dia Free e 15/dia VIP. |
| Storage | Ativo | Bucket privado, caminhos por usuário, URLs assinadas temporárias e limite de 10 MiB. |
| Compra de créditos | Não conectado | A tela existe, mas checkout ainda não está ligado. |

## Motivo da suspensão

A saída do modelo público Sana ficou sexualizada apesar de o pedido apresentado no chat não solicitar conteúdo sexual. O catálogo legado consultado lista somente Sana; o parâmetro `safe=true` ser reconhecido não comprova que o resultado seja moderado. A API atual do Pollinations tem opções de segurança mais explícitas, mas exige autenticação. Até haver uma escolha deliberada e uma validação adequada, a geração permanece bloqueada.

Fontes consultadas: [catálogo legado](https://image.pollinations.ai/models), [documentação de segurança Pollinations](https://github.com/pollinations/pollinations/blob/main/gen.pollinations.ai/src/docs/safety.md) e [relato de segurança no repositório oficial](https://github.com/pollinations/pollinations/issues/6600).

## Validação e publicação

- `pnpm build` e `git diff --check` passaram após as alterações.
- O deploy da função `generate-ai-image` versão 5 foi confirmado pelo Supabase MCP, com JWT obrigatório.
- Não havia sessão JWT de teste disponível para uma chamada autenticada de verificação.
- Nenhum workflow de GitHub Actions foi encontrado; por isso, o build do site frontend não foi publicado automaticamente por esta sessão. O bloqueio server-side já está ativo independentemente do deploy do frontend.
- Artefatos anteriores não foram apagados; continuam privados no Storage e no histórico até pedido explícito de remoção.

## Secrets

Nenhuma chave de geração de imagem é exigida no frontend. O endpoint suspenso não precisa de segredo do provedor. `SUPABASE_SERVICE_ROLE_KEY` não é usado pela versão 5.
