# LibreTranslate

O site usa a Edge Function `decidly-translate` como proxy seguro. O frontend nunca recebe a URL privada nem a chave da instância.

## Configuração no Supabase

No projeto Supabase, configure os secrets da Edge Function `decidly-translate`:

```bash
supabase secrets set \
  LIBRETRANSLATE_URL=https://sua-instancia-libretranslate.exemplo \
  LIBRETRANSLATE_API_KEY=sua-chave-opcional
```

Também é possível configurar os mesmos valores pelo painel do Supabase em **Edge Functions → Secrets**.

`LIBRETRANSLATE_URL` deve apontar para a raiz da instância, sem `/translate`; a função acrescenta esse caminho automaticamente. A chave é opcional para instâncias próprias sem autenticação.

Se `LIBRETRANSLATE_URL` não estiver configurada, o seletor e o dicionário local continuam funcionando, mas textos que não possuem tradução local permanecem no idioma original até a instância ser configurada.
