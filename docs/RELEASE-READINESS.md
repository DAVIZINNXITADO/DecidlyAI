# Checklist de prontidão do DecidlyAI

Última auditoria: **4 de outubro de 2026**.

Este documento separa o que está no repositório do que foi verificado no projeto Supabase de produção (`decidlyai-production`, `bwnnfcgwwuvfikquqelq`, região `sa-east-1`).

## Resumo executivo

Workspace, autenticação, conversas, streaming, respostas ricas, créditos e geração de PDF/imagem estão no código. Em produção, `generate-ai-image` está na versão **4** com verificação JWT habilitada; `groq-free` está na versão **11**. A função de imagem usa o endpoint público legado do Pollinations sem chave e salva o arquivo no bucket privado `decidlyai-artifacts` (limite de 10 MiB). A chamada direta ao provedor foi confirmada sem autenticação e retornou uma imagem Sana 768×768.

**Escolha de provedor confirmada pelo usuário:** manter o endpoint keyless, aceitando Sana. O endpoint legado atualmente não oferece FLUX; a API atual de FLUX do Pollinations exige chave. Não anunciar este fluxo como FLUX.

Pagamentos ainda estão apenas com a tela de pacotes; não existe checkout real conectado. A monetização usa formatos display padrão do Adsterra; não há anúncios recompensados nem créditos concedidos por visualizações.

## O que está implementado

| Área | Estado | Observação |
|---|---|---|
| Aplicação React/TanStack Start | Build validado | `pnpm build` concluiu sem erro. |
| Login e sessão | Implementado | Supabase Auth no frontend e nas Edge Functions. |
| Workspace e streaming | Implementado | Conversas, histórico, seleção de ferramentas e estados de processamento; para imagem, mostra “Preparando sua imagem…”. |
| PDF | Implementado | PDF A4 simples, até 12.000 caracteres/8 páginas; 1 crédito pelo arquivo + uso normal da resposta; limite 1/dia Free e 3/dia VIP. Não lê PDFs. |
| Imagem por IA | Implantado | Pollinations público sem chave, modelo `sana`, parâmetro 768×768, seed aleatória, prompt até 1.500 caracteres; custo 2,5 créditos; limite 3/dia Free e 9/dia VIP. A função exige cabeçalho `x-model-used: sana`. |
| Créditos de artefatos | Implementado e migration aplicada | RPCs transacionais/idempotentes reservam, liquidam ou devolvem créditos; limite aplicado no banco. |
| Storage dos artefatos | Implementado e migration aplicada | Bucket privado, caminhos por usuário, URLs assinadas temporárias, limite 10 MiB; aceita PDF, PNG, JPEG e WebP. |
| Compra de créditos | Não conectado | A tela existe, mas checkout ainda não está ligado. |

## Deploy e validação da imagem

- `generate-ai-image`: versão **4**, ativa, `verify_jwt=true`.
- `groq-free`: versão **11**, ativa, prompt alinhado a pedidos explícitos e ao endpoint Sana.
- A função de imagem remove a exigência de `POLLINATIONS_API_KEY` e não usa `FAL_KEY`, `fal.run` ou `fal.media`.
- A migration `20261004115801_allow_webp_generated_images` está aplicada. O bucket permanece privado e limitado a 10 MiB.
- O endpoint legado foi testado diretamente sem chave: HTTP 200, `image/jpeg`, `x-auth-status: unauthenticated`, `x-model-used: sana`; o arquivo recebido tinha 768×768.
- `pnpm build` e `git diff --check` passaram.

**Pendente para fechar o teste ponta a ponta:** usar uma sessão autenticada de teste com créditos para confirmar retorno de `path`, presença do objeto no Storage e renderização na conversa via URL assinada; testar também estorno e replay com o mesmo `operation_id`. Não havia token/sessão de teste disponível durante esta execução.

`POLLINATIONS_API_KEY` não é necessário nem deve ser pedido por este fluxo. A API atual do Pollinations que oferece FLUX exige autenticação; para manter a escolha sem chave, o produto usa Sana pelo endpoint legado. Nenhuma chave de geração de imagem é enviada ao navegador. `SUPABASE_SERVICE_ROLE_KEY` permanece exclusivamente server-side.

## Limites diários

Os limites são aplicados pelo banco por dia (America/Sao_Paulo): PDF 1 Free/3 VIP; imagem por IA 3 Free/9 VIP; imagem básica 5 Free/15 VIP. Cada ação gera no máximo um artefato e também exige saldo suficiente. O PDF debita 1 crédito pelo arquivo, além do uso normal da resposta.

## Variáveis e secrets

Variáveis públicas preparadas em `.env.example`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PAYMENT_PROVIDER`, apenas para identificar provedor no frontend
- `VITE_PAYMENT_CHECKOUT_URL`, apenas se houver checkout hospedado público

Segredos de Supabase e de pagamentos ficam somente no ambiente server-side apropriado. A geração pública keyless por Pollinations não requer segredo do provedor.

## Pendências de produto fora deste fluxo

- Validar a geração autenticada e o render da imagem na conversa com uma sessão de teste.
- Implementar checkout e webhook de pagamentos idempotente.
- Validar acessibilidade, dispositivos móveis, cookies e política de privacidade.
