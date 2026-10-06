# Referência de integração — AbacatePay API v2

Última conferência: 6 de outubro de 2026.

## Checkout hospedado

A criação de checkout usa `POST https://api.abacatepay.com/v2/checkouts/create`. O payload aceita `items` com `id` e `quantity`, `methods`, `externalId`, `returnUrl`, `completionUrl` e `metadata`; a URL hospedada é devolvida em `data.url`.

Fonte oficial: [Criar um Checkout](https://docs.abacatepay.com/pages/payment/create).

## Webhook e assinatura

O webhook envia POST com envelope `event`, `apiVersion`, `devMode` e `data`. A documentação geral também descreve um `id` no envelope, mas um payload real de Sandbox entregue ao projeto omitiu esse campo na raiz. Em `checkout.completed`, os detalhes ficam em `data.checkout`, incluindo `id`, `externalId`, `amount`, `paidAmount`, `items`, `status`, `methods` e `metadata`. O handler usa o `id` raiz quando existe; se não, usa o ID estável do checkout como event ID.

O header `X-Webhook-Signature` contém HMAC-SHA256 do corpo bruto UTF-8 usando a chave pública da AbacatePay, codificado em Base64 e comparado em tempo constante. No painel, o campo `Secret` do webhook deve coincidir com `ABACATEPAY_WEBHOOK_SECRET` no Supabase; a AbacatePay envia o valor como query `webhookSecret`. Esse secret é separado de `ABACATEPAY_PUBLIC_KEY` e não deve ser usado como chave HMAC.

A AbacatePay considera entregue qualquer resposta `2xx`; timeout e `5xx` têm retentativas, mas respostas `4xx` como `401 Unauthorized` não são retentadas automaticamente. O painel permite reenvio manual. Reenvios automáticos repetem o mesmo ID quando enviado; o reenvio manual pode criar outro ID, portanto o backend também mantém uma chave única da cobrança (`externalId`) para não duplicar créditos.

Fontes oficiais: [Webhooks e segurança](https://docs.abacatepay.com/pages/webhooks) e [Evento de Checkout](https://docs.abacatepay.com/pages/webhooks/events/checkout).
