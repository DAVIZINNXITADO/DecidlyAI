# Referência de integração — AbacatePay API v2

Última conferência: 5 de outubro de 2026.

## Checkout hospedado

A criação de checkout usa `POST https://api.abacatepay.com/v2/checkouts/create`. O payload aceita `items` com `id` e `quantity`, `methods`, `externalId`, `returnUrl`, `completionUrl` e `metadata`; a URL hospedada é devolvida em `data.url`.

Fonte oficial: [Criar um Checkout](https://docs.abacatepay.com/pages/payment/create).

## Webhook e assinatura

O webhook envia POST com envelope `id`, `event`, `apiVersion`, `devMode` e `data`. Em `checkout.completed`, os detalhes ficam em `data.checkout`, incluindo `id`, `externalId`, `amount`, `paidAmount`, `items`, `status` e `methods`.

Quando o header `X-Webhook-Signature` estiver presente, a documentação especifica HMAC-SHA256 do corpo bruto UTF-8 usando `ABACATEPAY_PUBLIC_KEY`, codificado em Base64 e comparado em tempo constante. O secret configurado na URL é uma camada separada de autenticação e não deve ser usado como chave HMAC.

A AbacatePay documenta o secret na query `webhookSecret`, eventos `checkout.completed` e retentativas após falhas 5xx. Reenvios automáticos repetem o mesmo `id`; o reenvio manual pode criar novo ID, portanto o backend também mantém uma chave única da cobrança para evitar duplicar créditos.

Fontes oficiais: [Webhooks e segurança](https://docs.abacatepay.com/pages/webhooks) e [Evento de Checkout](https://docs.abacatepay.com/pages/webhooks/events/checkout).
