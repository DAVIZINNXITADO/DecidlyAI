# Capacidades atuais do DecideAI

Auditoria do código local em 2026-10-02. Este documento distingue funcionalidades implementadas no repositório de funcionalidades que só ficam disponíveis no ambiente depois do deploy e da configuração do Supabase.

## Implementado no código

- Conversa de texto com a IA e histórico de conversas.
- **PDF simples**: conteúdo final preparado pela IA é transformado em PDF A4 com texto em alfabeto latino, guardado em Storage privado e anexado à conversa. O arquivo custa 1 crédito; a geração do conteúdo usa a cobrança normal da conversa. Limite: 1 PDF/dia Free ou 3/dia VIP; máximo de 12.000 caracteres e 8 páginas. Não lê PDFs enviados.
- **Imagem profissional por IA**: Supabase Edge Function chama `fal-ai/flux/schnell` no servidor, usa uma imagem quadrada 1024×1024 e mantém o safety checker ligado. Custa 2,5 créditos; limites: 3/dia Free ou 9/dia VIP; prompt de até 1.500 caracteres.
- **Imagem básica de texto**: Canvas cria localmente uma imagem PNG quadrada 1024×1024 com fundo escuro e texto branco. Custa 0,5 crédito; limites: 5/dia Free ou 15/dia VIP; texto de até 220 caracteres. Esta cota é separada da imagem profissional.
- Os blocos de ação exigem clique explícito, apresentam custo/limite e recebem ID idempotente. Cada execução cria no máximo um artefato; execuções adicionais dependem do saldo. A cobrança é reservada no banco e estornada se a geração não concluir.
- Os arquivos ficam em bucket privado, com acesso por usuário e links assinados temporários.
- O histórico guarda qual ferramenta o usuário selecionou e substitui a ação concluída pelo link ou imagem gerada.
- O plano Free tem limite de 5 créditos no saldo diário renovável. Créditos de convite e créditos comprados ficam em saldos separados.
- O consumo normal de conversa usa estimativa de tokens baseada no contexto/resposta; não é contagem exata fornecida pelo provedor.

## Requisitos para ficar ativo no ambiente

O código deste repositório, sozinho, ainda não prova que o recurso está implantado no Supabase. Antes de anunciá-lo como disponível em produção:

1. Aplicar a migration `20261002100000_ai_artifact_limits_and_storage.sql`.
2. Implantar `generate-ai-image` e a atualização de `groq-free`.
3. Configurar uma **nova** chave `FAL_KEY` como secret server-side no Supabase; a chave enviada anteriormente em conversa deve ser revogada/rotacionada.
4. Validar com usuário autenticado: geração, Storage privado, débito, cota diária, estorno, repetição/idempotência e recuperação de reserva abandonada.

## Não anunciar como funcional

- Pesquisa na web ou pesquisa avançada com fontes externas.
- Upload, leitura ou análise de arquivos e PDFs. O seletor anterior guardava apenas nomes de arquivos, não os conteúdos.
- Criação de arquivos genéricos além do PDF de texto.
- Plugins.
- Plano VIP, preço, benefícios e limites de negócio não conectados a um checkout real.
- Pagamento/recarga de créditos: a tela ainda não tem checkout real conectado.

## Regras de copy

- Não listar provedores ou modelos específicos em páginas públicas; a configuração de roteamento pode mudar e algumas rotas alternativas dependem do deployment.
- Descrever a cobrança de conversa como estimativa baseada no volume de texto/contexto.
- No botão `+`, listar somente as três ferramentas implementadas e mostrar custo/limite antes do envio.
- Nunca sugerir que abrir, ler, analisar ou anexar um PDF é suportado: a ferramenta PDF só exporta texto preparado pela IA.
- Não dizer que uma imagem/PDF foi criado antes de a ação manual concluir e o artefato estar armazenado.
