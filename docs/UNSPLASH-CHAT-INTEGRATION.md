# Integração de imagens contextuais do Unsplash

## Requisitos oficiais verificados

- A busca usa `GET https://api.unsplash.com/search/photos` com `query`, `orientation`, `content_filter` e `per_page`. A aplicação exibe a URL hotlink fornecida em `photo.urls.regular`; não baixa nem re-hospeda o arquivo.
- Quando uma foto é selecionada para inserção no app, a integração chama o `links.download_location` retornado pelo Unsplash com `GET`. Esse endpoint é somente de tracking; ele não substitui a URL hotlink.
- Cada imagem informa o nome do fotógrafo com link para o perfil do Unsplash e inclui link para o Unsplash. Todos esses links usam `utm_source=decidlyai` e `utm_medium=referral`.
- A consulta usa uma categoria fixa dentre `running`, `travel`, `nature`, `food` e `architecture`; não recebe o texto do usuário, o histórico, IDs de conversa ou identificadores pessoais.
- A busca só ocorre depois do consentimento de serviços não essenciais. O endpoint exige uma sessão válida e reserva no banco, com validação de propriedade, no máximo uma busca por conversa; também aplica um limite transitório por usuário.
- A chave de acesso deve existir somente como segredo de Edge Function chamado `UNSPLASH_ACCESS_KEY`. Não use prefixo `VITE_`, não a inclua no repositório e não use a Secret Key para busca pública.

## Limites e ativação

O modo de demonstração do Unsplash documenta um limite padrão de 50 requisições por hora; o modo de produção documenta 1.000 por hora após aprovação da aplicação. A busca atual só ocorre para assuntos visuais aprovados, no máximo uma vez por conversa e até oito solicitações por usuário/minuto por instância Edge. A imagem falha silenciosamente quando o segredo não está configurado, preservando o fluxo de chat.

A chave enviada no chat durante a configuração deve ser considerada exposta. Revogue e substitua as credenciais no painel do Unsplash antes de ativar a integração. Depois, no Supabase, adicione somente a nova Access Key em **Project Settings → Edge Functions → Secrets**, com o nome exato `UNSPLASH_ACCESS_KEY`; a Secret Key não é necessária.

## Fontes oficiais

- [Documentação da API Unsplash](https://unsplash.com/documentation) — busca de fotos, URLs hotlink e campo `download_location`.
- [Diretrizes da API Unsplash](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines) — atribuição, hotlink e acionamento do endpoint de download.
