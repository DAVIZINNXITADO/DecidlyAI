# Capacidades atuais do DecidlyAI

Auditoria de código e produção em **4 de outubro de 2026**.

## Implementado

- Conversa com IA, histórico, respostas ricas e execução de ações explícitas.
- **Imagem por IA**: o chat transforma pedidos explícitos em uma única ação com prompt visual limpo; após o consentimento local inicial, a geração segue automaticamente. Enquanto a imagem está sendo preparada, o chat não exibe briefing técnico nem JSON.
- A Edge Function autenticada chama o endpoint público legado do Pollinations sem chave de provedor, solicita o modelo `sana` e verifica o cabeçalho `x-model-used` antes de aceitar a resposta. A imagem é guardada no bucket privado `decidlyai-artifacts` e anexada à conversa. Custo: 2,5 créditos; limites: 3/dia Free ou 9/dia VIP; prompt até 1.500 caracteres.
- **Limitação importante do serviço público atual**: uma geração real sem autenticação retornou JPEG 768×768 com `x-model-used: sana`. O catálogo do endpoint legado lista somente `sana`; ele não entrega FLUX mesmo que se envie `model=flux`. A API atual do Pollinations aceita FLUX, mas exige chave. Portanto, esta implantação prioriza a opção keyless escolhida e não deve ser anunciada como FLUX.
- **PDF simples**: conteúdo final da IA é transformado em PDF A4, guardado em Storage privado e anexado. Custa 1 crédito pelo arquivo, além da cobrança normal da resposta; limite de 1/dia Free ou 3/dia VIP; máximo de 12.000 caracteres e 8 páginas. Não lê PDFs enviados.
- **Imagem básica de texto**: Canvas cria PNG quadrado 1024×1024 com texto de até 220 caracteres. Custa 0,5 crédito; limite de 5/dia Free ou 15/dia VIP, em cota separada.
- Operações de artefato usam IDs idempotentes e reservas de crédito. Falhas após reserva chamam a liberação para estornar. Arquivos são privados, com acesso por usuário e links assinados temporários.

## Estado verificado em produção

- Projeto Supabase: `decidlyai-production` (`bwnnfcgwwuvfikquqelq`), região `sa-east-1`.
- `generate-ai-image`: versão **4**, ativa, `verify_jwt=true`; executa Pollinations sem `POLLINATIONS_API_KEY` e sem `FAL_KEY`.
- `groq-free`: versão **11**, ativa, com instruções de chat alinhadas ao fluxo automático e ao modelo Sana.
- O bucket `decidlyai-artifacts` continua privado, limitado a 10 MiB e permite PDF, PNG, JPEG e WebP. A migration `20261004115801_allow_webp_generated_images` está aplicada.
- Nenhuma função implantada para este fluxo envia chave de imagem ao navegador.

## Validação e limitação de teste

- Foi confirmada uma geração direta e sem chave no endpoint público: HTTP 200, `image/jpeg`, `x-auth-status: unauthenticated`, `x-model-used: sana`, dimensões reais 768×768.
- `pnpm build` e `git diff --check` passaram.
- Não foi feita uma chamada autenticada de ponta a ponta com conta de teste: não havia sessão/token de usuário disponível neste ambiente. Portanto, ainda falta confirmar numa sessão autenticada que a resposta da Edge Function inclui `path`, o arquivo aparece no bucket e a conversa o renderiza via URL assinada.

## Variáveis e secrets

`POLLINATIONS_API_KEY` e `FAL_KEY` não são requisitos deste caminho e não devem ser verificados ou expostos pelo frontend. O `SUPABASE_SERVICE_ROLE_KEY` continua exclusivamente no ambiente server-side da Edge Function. Uma futura troca para FLUX pela API atual do Pollinations exigiria uma chave server-side e uma alteração deliberada desta escolha keyless.

## Não anunciar como funcional

- FLUX sem chave no endpoint legado.
- Pesquisa na web, leitura/análise de PDFs enviados, anexos, upload ou edição de imagens.
- Geração de arquivos genéricos além do PDF suportado.
- Compra/recarga de créditos: a tela ainda não tem checkout real conectado.
