# DeepL

A Edge Function `decidly-translate` usa DeepL como proxy seguro. A chave nunca fica no frontend nem no repositório.

## Secret no Supabase

Configure no projeto Supabase, em **Edge Functions → Secrets**:

```text
DEEPL_API_KEY
```

A função usa automaticamente o endpoint gratuito `https://api-free.deepl.com/v2/translate`, compatível com chaves DeepL que terminam em `:fx`.

Se `DEEPL_API_KEY` ainda não estiver configurada, o seletor de idioma continua funcionando com o dicionário local e textos sem tradução remota permanecem no idioma original.
