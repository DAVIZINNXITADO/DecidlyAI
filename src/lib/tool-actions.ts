import { toPlainArtifactText } from "./rich-markup";

type ToolSelection = {
  id: "create_pdf" | "create_image" | "create_text_image";
  label: string;
};

const ACTION_BLOCK_PATTERN = /\[action\b([^\]]*)\]([\s\S]*?)\[\/action\]/gi;
const ACTION_ATTRIBUTE_PATTERN = /(?:^|\s)([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/gi;
const CAPABILITY_REFUSAL_PATTERN =
  /(?:não\s+(?:posso|consigo|tenho como)\s+(?:criar|gerar|produzir)\s+(?:uma?\s+)?(?:imagens?|pdfs?|arquivos?)|não\s+tenho\s+(?:essa\s+)?capacidade|(?:i\s+)?(?:can't|cannot)\s+(?:create|generate|make)\s+(?:an?\s+)?(?:images?|pdfs?|files?))/i;

function attributes(raw: string) {
  return Object.fromEntries(
    Array.from(raw.matchAll(ACTION_ATTRIBUTE_PATTERN), (match) => [
      (match[1] ?? "").toLowerCase(),
      match[2] ?? match[3] ?? match[4] ?? "",
    ]),
  );
}

function withFreshRequestIds(content: string, createRequestId: () => string) {
  return content.replace(ACTION_BLOCK_PATTERN, (_whole, rawAttributes: string) => {
    const safeAttributes = rawAttributes
      .replace(/(?:^|\s)(?:request_id|id)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s]+)/gi, " ")
      .trim();
    const extra = safeAttributes ? ` ${safeAttributes}` : "";
    return `[action request_id="${createRequestId()}"${extra}]`;
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
