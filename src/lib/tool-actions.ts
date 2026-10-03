import { normalizeActionProtocolMarkup, toPlainArtifactText } from "./rich-markup";
import {
  countTextImageChars,
  fitTextImageText,
  MAX_TEXT_IMAGE_CHARS,
  parseTextImagePayload,
} from "./text-image";

type ToolSelection = {
  id: "create_pdf" | "create_image" | "create_text_image";
  label: string;
};

const ACTION_BLOCK_PATTERN = /\[action\b([^\]]*)\]([\s\S]*?)\[\/action\]/gi;
const ACTION_ATTRIBUTE_PATTERN = /(?:^|\s)([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/gi;
const CAPABILITY_REFUSAL_PATTERN =
  /(?:não\s+(?:posso|consigo|tenho como)\s+(?:criar|gerar|produzir)\s+(?:uma?\s+)?(?:imagens?|pdfs?|arquivos?)|não\s+tenho\s+(?:essa\s+)?capacidade|(?:i\s+)?(?:can't|cannot)\s+(?:create|generate|make)\s+(?:an?\s+)?(?:images?|pdfs?|files?))/i;
const LONG_FORM_WRITING_PATTERN =
  /\b(?:redacao|essay|ensayo|fabula|fable|conto|cuento|dissertacao|dissertation|monografia|relatorio|report|artigo|article)\b/;
const COMPLETE_TEXT_PATTERN =
  /\b(?:texto|text|historia|story|poema|poem|carta|letter|roteiro|script)\b.{0,40}\b(?:inteiro|inteira|completo|completa|full|complete|entire|whole|long\s+form)\b/;
const TEXT_IMAGE_LIMIT_NOTICE = `\n\nA imagem de texto aceita até ${MAX_TEXT_IMAGE_CHARS} caracteres. O conteúdo foi mantido como texto e nenhum crédito foi consumido.`;
const TEXT_IMAGE_PROMPT_ADJUSTMENT_NOTICE =
  "\n\nO conteúdo foi ajustado ao número de caracteres pedido para caber na imagem.";

function normalizeIntentText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isLongFormWritingRequest(value: string) {
  const request = normalizeIntentText(value);
  return LONG_FORM_WRITING_PATTERN.test(request) || COMPLETE_TEXT_PATTERN.test(request);
}

function explicitlyRequestsImage(value: string) {
  const request = normalizeIntentText(value);
  return (
    /\b(?:em|como|para|pra|na|no|numa|num)\s+(?:uma?\s+)?(?:imagem|imagens|cartaz|poster|flyer)\b/.test(
      request,
    ) ||
    /\b(?:crie|gere|faca|fazer|coloque|transforme|renderize|converta|exporte|mostre)\b.{0,60}\b(?:imagem|imagens|cartaz|poster|flyer)\b/.test(
      request,
    ) ||
    /\b(?:imagem|cartaz|poster|flyer)\b.{0,50}\b(?:com|do|da|desse|deste)\s+(?:o\s+)?texto\b/.test(
      request,
    )
  );
}

function requestedCharacterCount(value: string) {
  const match = normalizeIntentText(value).match(/\b(\d{1,5})\s*(?:caracter(?:e|es)?|chars?)\b/);
  if (!match) return null;
  const count = Number(match[1]);
  return Number.isInteger(count) && count > 0 ? count : null;
}

function shouldKeepLongFormInChat(value: string, selectedTool: ToolSelection | null) {
  return (
    isLongFormWritingRequest(value) &&
    !(explicitlyRequestsImage(value) && (!selectedTool || selectedTool.id === "create_text_image"))
  );
}

/**
 * Writing requests stay in chat by default. An explicit request to render that
 * writing as an image may use the text-image tool within its character limit.
 */
export function resolveSelectedToolForRequest<T extends ToolSelection>(
  selectedTool: T | null,
  userRequest: string,
): T | null {
  if (
    selectedTool?.id === "create_text_image" &&
    shouldKeepLongFormInChat(userRequest, selectedTool)
  ) {
    return null;
  }

  return selectedTool;
}

function attributes(raw: string) {
  return Object.fromEntries(
    Array.from(raw.matchAll(ACTION_ATTRIBUTE_PATTERN), (match) => [
      (match[1] ?? "").toLowerCase(),
      match[2] ?? match[3] ?? match[4] ?? "",
    ]),
  );
}

function withFreshRequestIds(content: string, createRequestId: () => string) {
  return content.replace(ACTION_BLOCK_PATTERN, (_whole, rawAttributes: string, body: string) => {
    const safeAttributes = rawAttributes
      .replace(/(?:^|\s)(?:request_id|id)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s]+)/gi, " ")
      .trim();
    const extra = safeAttributes ? ` ${safeAttributes}` : "";
    return `[action request_id="${createRequestId()}"${extra}]${body}[/action]`;
  });
}

function removeOversizedTextImageActions(content: string, userRequest: string) {
  return content.replace(ACTION_BLOCK_PATTERN, (whole, rawAttributes: string, body: string) => {
    if (attributes(rawAttributes)["type"] !== "create_text_image") return whole;
    const parsedPayload = parseTextImagePayload(body);
    let payload = toPlainArtifactText(parsedPayload.text);
    const requestedLimit = requestedCharacterCount(userRequest);
    const canHonorRequestedLimit =
      requestedLimit !== null && requestedLimit <= MAX_TEXT_IMAGE_CHARS;
    const effectiveLimit = canHonorRequestedLimit ? requestedLimit : MAX_TEXT_IMAGE_CHARS;
    const needsTruncation = countTextImageChars(payload) > effectiveLimit;

    if (countTextImageChars(payload) > MAX_TEXT_IMAGE_CHARS && !canHonorRequestedLimit) {
      return `${payload}${TEXT_IMAGE_LIMIT_NOTICE}`;
    }
    if (needsTruncation) payload = fitTextImageText(payload, effectiveLimit);
    const designBlock = parsedPayload.design
      ? `[image_design]${parsedPayload.design}[/image_design]`
      : "";
    return needsTruncation
      ? `[action${rawAttributes}]${designBlock}${payload}[/action]${TEXT_IMAGE_PROMPT_ADJUSTMENT_NOTICE}`
      : whole;
  });
}

/**
 * Normalize model output after streaming. If a tool was explicitly selected but
 * the model omitted or mistyped the action block, its response (or the user's
 * explicit request if the model only refused on capability grounds) becomes the
 * payload for a user-confirmed action card. It never executes the artifact.
 */
export function ensureToolActionResponse(
  content: string,
  selectedTool: ToolSelection | null,
  userRequest: string,
  createRequestId: () => string = () => crypto.randomUUID(),
) {
  const normalizedContent = normalizeActionProtocolMarkup(content);

  if (shouldKeepLongFormInChat(userRequest, selectedTool)) {
    const responseAsText = normalizedContent.replace(
      ACTION_BLOCK_PATTERN,
      (whole, rawAttributes: string, body: string) =>
        attributes(rawAttributes)["type"] === "create_text_image" ? body : whole,
    );
    const cleanResponse = withFreshRequestIds(responseAsText.trim(), createRequestId);
    return selectedTool?.id === "create_text_image"
      ? `${cleanResponse}${TEXT_IMAGE_LIMIT_NOTICE}`
      : cleanResponse;
  }

  if (!selectedTool) {
    return withFreshRequestIds(
      removeOversizedTextImageActions(normalizedContent, userRequest),
      createRequestId,
    );
  }

  const actionMatches = Array.from(normalizedContent.matchAll(ACTION_BLOCK_PATTERN));
  const matchingAction = actionMatches.find(
    (match) => attributes(match[1] ?? "")["type"] === selectedTool.id,
  );
  const source =
    matchingAction?.[2] ??
    actionMatches[0]?.[2] ??
    normalizedContent.replace(ACTION_BLOCK_PATTERN, "").trim();
  const parsedTextImagePayload =
    selectedTool.id === "create_text_image" ? parseTextImagePayload(source) : null;
  let payload = toPlainArtifactText(parsedTextImagePayload?.text ?? source);
  if (!payload || CAPABILITY_REFUSAL_PATTERN.test(payload)) {
    payload = toPlainArtifactText(userRequest);
  }
  if (!payload) return withFreshRequestIds(normalizedContent, createRequestId);
  if (selectedTool.id === "create_text_image") {
    const requestedLimit = requestedCharacterCount(userRequest);
    const canHonorRequestedLimit =
      requestedLimit !== null && requestedLimit <= MAX_TEXT_IMAGE_CHARS;
    const effectiveLimit = canHonorRequestedLimit ? requestedLimit : MAX_TEXT_IMAGE_CHARS;
    const needsTruncation = countTextImageChars(payload) > effectiveLimit;

    if (countTextImageChars(payload) > MAX_TEXT_IMAGE_CHARS && !canHonorRequestedLimit) {
      return `${payload}${TEXT_IMAGE_LIMIT_NOTICE}`;
    }
    if (needsTruncation) payload = fitTextImageText(payload, effectiveLimit);

    const designBlock = parsedTextImagePayload?.design
      ? `[image_design]${parsedTextImagePayload.design}[/image_design]`
      : "";
    const action = `[action type="${selectedTool.id}" title="${selectedTool.label}" request_id="${createRequestId()}"]${designBlock}${payload}[/action]`;
    return needsTruncation && canHonorRequestedLimit
      ? `${action}${TEXT_IMAGE_PROMPT_ADJUSTMENT_NOTICE}`
      : action;
  }

  return `[action type="${selectedTool.id}" title="${selectedTool.label}" request_id="${createRequestId()}"]${payload}[/action]`;
}
