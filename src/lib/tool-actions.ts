import { toPlainArtifactText } from "./rich-markup";

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

/**
 * The text-image tool is for short, exact copy (maximum 220 characters), not
 * for writing an essay, story, or other complete work. In that conflict, honor
 * the user's writing request as a normal chat response instead of preparing a
 * paid image action from the prompt or generated answer.
 */
export function resolveSelectedToolForRequest<T extends ToolSelection>(
  selectedTool: T | null,
  userRequest: string,
): T | null {
  if (selectedTool?.id === "create_text_image" && isLongFormWritingRequest(userRequest)) {
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
  if (isLongFormWritingRequest(userRequest)) {
    const responseAsText = content.replace(
      ACTION_BLOCK_PATTERN,
      (whole, rawAttributes: string, body: string) =>
        attributes(rawAttributes)["type"] === "create_text_image" ? body : whole,
    );
    return withFreshRequestIds(responseAsText.trim(), createRequestId);
  }

  if (!selectedTool) return withFreshRequestIds(content, createRequestId);

  const actionMatches = Array.from(content.matchAll(ACTION_BLOCK_PATTERN));
  const matchingAction = actionMatches.find(
    (match) => attributes(match[1] ?? "")["type"] === selectedTool.id,
  );
  const source =
    matchingAction?.[2] ??
    actionMatches[0]?.[2] ??
    content.replace(ACTION_BLOCK_PATTERN, "").trim();
  let payload = toPlainArtifactText(source);
  if (!payload || CAPABILITY_REFUSAL_PATTERN.test(payload)) {
    payload = toPlainArtifactText(userRequest);
  }
  if (!payload) return withFreshRequestIds(content, createRequestId);

  return `[action type="${selectedTool.id}" title="${selectedTool.label}" request_id="${createRequestId()}"]${payload}[/action]`;
}
