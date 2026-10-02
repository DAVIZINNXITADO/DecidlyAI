# Checklist de prontidão do DecidlyAI

Última auditoria de código: **2 de outubro de 2026**.

Este documento separa funcionalidades implementadas no código das que dependem de configuração externa e validação no ambiente Supabase.

## Resumo executivo

O workspace, autenticação, conversas, streaming, respostas ricas, créditos e páginas institucionais estão presentes. As ferramentas opcionais de PDF e imagem agora têm fluxo de código ponta a ponta, mas ainda dependem de migration/deploy/secret no Supabase para operar em produção. Pagamentos ainda estão apenas com a tela de pacotes; não existe checkout real conectado. A monetização por anúncios usa formatos display padrão do Adsterra nas posições descritas em `MONETAG-AD-SETUP.md`; não há anúncios recompensados nem créditos concedidos por visualização de anúncio.

## O que está implementado no repositório

| Área | Estado | Observação |
|---|---|---|
| Aplicação React/TanStack Start | Implementado | Build e typecheck executados sem erros nesta revisão. |
| Login e sessão | Implementado | Supabase Auth é usado pelo frontend e pelas Edge Functions. |
| Workspace | Implementado | Conversas, histórico, mensagens, seleção de ferramenta e estados de envio/processamento. |
| Streaming | Implementado | Streaming SSE com atualização progressiva e cancelamento da geração. |
| Rota Free | Parcial | `decidly-ai-stream` consulta créditos e encaminha para `free-ai-router`; fallback de provedores depende do ambiente implantado. |
| Rota VIP | Parcial | O caminho precisa ser revisado antes de ser tratado como rota VIP isolada em produção. |
| Perguntas contextuais | Implementado no contrato/UI | A IA pode emitir `[question]`; a pergunta aparece sem bloquear a caixa de mensagem. |
| Respostas ricas | Implementado | Markdown seguro, ações explícitas, cartões de PDF e imagem privada. |
| Central do botão “+” | Implementado | PDF, imagem por IA e imagem de texto; cada item informa custo e limite. Sem anexos ou plugins. |
| PDF | Implementado no código | PDF A4 simples em alfabeto latino, até 12.000 caracteres/8 páginas, 3 créditos por execução; armazenamento privado e link de download. Não lê PDFs. |
| Imagem por IA | Implementado no código | Edge Function chama FLUX.1 Schnell com chave server-side; 1024×1024, 4 passos, 6 créditos por execução, prompt de até 1.500 caracteres. |
| Imagem de texto | Implementado no código | Canvas cria PNG 1024×1024, texto até 220 caracteres, 6 créditos por execução. |
| Créditos de artefatos | Implementado no código; migration pendente | RPCs transacionais e idempotentes reservam, liquidam ou devolvem crédito; a cota é aplicada no banco. |
| Storage dos artefatos | Implementado no código; migration pendente | Bucket privado, políticas de caminho por usuário e URLs assinadas temporárias. |
| Indicações | Implementado | Código, campanha e recompensa aparecem no workspace/créditos. |
| Anúncios recompensados | Fora de escopo | Não oferecer visualizações de anúncio em troca de créditos. Migration preparada para revogar RPCs legadas; ainda precisa ser aplicada ao ambiente. |
| Compra de créditos | Não conectado | A tela exibe pacotes, mas o clique ainda informa que o checkout será integrado. |
| TTS | Implementado | Existe função de texto para voz e controles na resposta. |

## Artefatos: configuração necessária para produção

O código ainda não está ativo em produção até completar todos estes passos:

1. Aplicar todas as migrations pendentes, incluindo `20261002100000_ai_artifact_limits_and_storage.sql`.
2. Implantar `generate-ai-image` e a versão atualizada de `groq-free`.
3. Configurar `FAL_KEY` em **Supabase Edge Function Secrets**, nunca em `VITE_*`, frontend ou Git.
4. Revogar e substituir a chave FAL compartilhada em conversa antes de configurar o secret; ela deve ser tratada como exposta.
5. Testar com conta autenticada, sem revelar a chave: saldo insuficiente, cotas diárias, duplicidade, estorno após falha, execução concorrente, arquivos privados e links assinados.
6. Confirmar que PDF, PNG e JPEG aparecem no histórico depois de recarregar a conversa.

Os limites implementados: 3 créditos por PDF e 6 por imagem; cada ação gera no máximo um artefato. Não há cota diária adicional por quantidade: novas execuções só ocorrem se o saldo de créditos permitir. O plano Free tem 5 créditos diários; por isso, qualquer geração de imagem exige créditos suficientes além desse saldo diário.

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

## Variáveis e secrets

As variáveis públicas preparadas estão no `.env.example`. Valores reais devem ser configurados no ambiente de deploy ou nos secrets do Supabase:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PAYMENT_PROVIDER`, apenas para identificar o provedor no frontend
- `VITE_PAYMENT_CHECKOUT_URL`, somente se for usado um checkout hospedado e público
- `PAYMENT_SECRET_KEY`, somente como secret server-side/Edge Function
- `PAYMENT_WEBHOOK_SECRET`, somente como secret server-side/Edge Function
- `FAL_KEY`, somente como Supabase Edge Function Secret; nunca como variável `VITE_*`

## Critérios antes de abrir para produção

- [ ] Aplicar todas as migrations no Supabase.
- [ ] Fazer deploy das Edge Functions usadas pelo workspace, incluindo `generate-ai-image`.
- [ ] Configurar uma chave FAL nova e revogar a chave exposta anteriormente.
- [ ] Aplicar a migration que revoga RPCs legadas de recompensa patrocinada; ela preserva os registros existentes.
- [ ] Isolar e validar a rota VIP.
- [ ] Implementar checkout e webhook idempotente.
- [ ] Testar cotas, saldo insuficiente, repetição, concorrência e estorno de artefatos.
- [ ] Validar que outros usuários não conseguem ler arquivos no bucket privado.
- [ ] Testar mobile, acessibilidade, links externos e estados offline.
- [ ] Testar aceite/recusa de cookies: aceitar carrega anúncios; recusar mantém todos os scripts Adsterra bloqueados.
- [ ] Revisar termos, privacidade, consentimento e política de anúncios.
