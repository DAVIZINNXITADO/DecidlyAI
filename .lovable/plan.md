# Atualizar a página inicial

## Implementação
- Preservar o `Navbar` e o `Footer` existentes e manter os IDs `como-funciona`, `recursos` e `planos`.
- Refinar o hero e a demonstração com o visual dark slate/violet atual, melhor hierarquia e responsividade.
- Manter o CTA principal do hero em `/login` e trocar o secundário por “Ver planos”, com rolagem suave para `#planos`.
- Ampliar a seção de planos com comparação clara entre Gratuito, disponível agora, e Pro/Premium, marcado como “Em breve”, sem preço ou cobrança inventados.
- Limitar os CTAs para `/login` ao hero, plano gratuito e CTA final.
- Adicionar metadados próprios da página inicial e corrigir o tipo portátil de `ReactNode`, sem alterar outros arquivos de produto.

## Verificação
- Executar a verificação de tipos focada no projeto e checar a página em desktop e mobile, corrigindo qualquer problema encontrado apenas em `src/routes/index.tsx`.
