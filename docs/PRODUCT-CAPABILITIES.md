# Capacidades atuais do DecideAI

Auditoria do código local em 2026-10-02. Este documento é interno e serve para manter a interface e as páginas públicas alinhadas ao que o produto realmente executa.

## Disponível agora

- Conversa de texto com a IA e histórico de conversas.
- Exportação básica do texto preparado pela IA para PDF (`src/lib/pdf.ts`). Ela cria páginas A4 com texto simples; não lê nem analisa PDFs enviados.
- O plano Free tem limite de 5 créditos no saldo diário renovável. Créditos de convite e créditos comprados ficam em saldos separados.
- O consumo de créditos usa uma estimativa de tokens a partir do tamanho do contexto e da resposta, e não a contagem exata fornecida pelo provedor.
- O código do roteador do plano Free tenta `groq-free` e depois `cloudflare-free`. A função `cloudflare-free` não está presente nesta cópia do repositório; a disponibilidade desse fallback no ambiente implantado não foi verificada. A interface não oferece escolha manual de modelo.

## Não anunciar como funcional até existir integração de ponta a ponta

- Pesquisa na web ou pesquisa avançada com fontes externas.
- Geração de imagens.
- Upload, leitura ou análise de arquivos e PDFs. O seletor anterior guardava apenas nomes de arquivos, não os conteúdos.
- Criação de arquivos genéricos, além da exportação PDF de texto.
- Plugins.
- Plano VIP, preço, benefícios e limites. Nenhum cadastro ou pagamento VIP está disponível.

## Regras de copy

- Não listar provedores ou modelos específicos em páginas públicas; a configuração de roteamento pode mudar e algumas rotas alternativas dependem do deployment.
- Descrever a cobrança como estimativa baseada no volume de texto/contexto.
- No botão `+`, mostrar somente a exportação básica de texto em PDF até que outras ferramentas sejam realmente implementadas.
- A exportação PDF atual não é um leitor de PDFs nem uma ferramenta de análise de documentos.
