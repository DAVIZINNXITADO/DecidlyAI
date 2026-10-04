# Capacidades atuais do DecidlyAI

Auditoria: **4 de outubro de 2026**.

## Funcionalidades ativas

- Conversa com IA, histórico, respostas ricas e execução de ações explícitas.
- **PDF simples:** conteúdo final da IA em PDF A4, armazenado no bucket privado e anexado à conversa. Custa 1 crédito pelo arquivo, além da cobrança normal da resposta; limite de 1/dia Free ou 3/dia VIP; máximo de 12.000 caracteres e 8 páginas. Não lê PDFs enviados.
- **Imagem de texto:** Canvas gera PNG quadrado 1024×1024 com texto de até 220 caracteres. Custa 0,5 crédito; limite de 5/dia Free ou 15/dia VIP, em cota separada.
- Artefatos usam IDs idempotentes e reservas de crédito. Falhas após reserva liberam a reserva. Arquivos no Storage são privados, com URLs assinadas temporárias.

## Imagem por IA — temporariamente suspensa

A geração de imagem visual por modelo está suspensa por segurança, após o endpoint público gerar uma imagem sexualizada a partir de uma solicitação que não descrevia conteúdo sexual.

- No código do frontend na branch, o item **Imagem por IA** permanece visível, mas desativado, no botão “+”; a publicação do frontend ainda não foi confirmada.
- Pedidos explícitos, seleções antigas e ações salvas são bloqueados no frontend.
- A Edge Function `generate-ai-image` foi substituída por uma resposta fail-closed: exige JWT e retorna HTTP 503 sem chamar o provedor, reservar créditos ou fazer upload.
- A geração só deve ser reativada após escolha e validação de um modelo com proteção de conteúdo apropriada.
- O endpoint público legado do Pollinations lista apenas Sana; `safe=true` não oferece garantia comprovada de moderação do resultado. A API atual com verificações de segurança exige autenticação.

Os artefatos anteriores não foram apagados: permanecem no Storage privado e no histórico da conversa até que haja pedido explícito para removê-los.

## Estado verificado em produção

- Projeto Supabase: `decidlyai-production` (`bwnnfcgwwuvfikquqelq`), região `sa-east-1`.
- `generate-ai-image`: versão **5**, ativa e com `verify_jwt=true`; resposta temporária de suspensão antes de qualquer reserva de crédito ou upload.
- Bucket `decidlyai-artifacts`: privado, limite de 10 MiB; permite PDF, PNG, JPEG e WebP. A migration `20261004115801_allow_webp_generated_images` está aplicada.
- Nenhuma chave de geração de imagem é exigida ou enviada ao navegador.

## Validação

- O build do frontend e `git diff --check` passaram após a implementação da suspensão.
- A suspensão foi validada pelo código e pela confirmação de implantação da versão 5. Não foi feita chamada autenticada à função, pois não havia sessão de teste disponível neste ambiente.
- Não foi realizado deploy do site frontend por não haver workflow de GitHub Actions identificado; a publicação do frontend depende da hospedagem conectada ao repositório.
