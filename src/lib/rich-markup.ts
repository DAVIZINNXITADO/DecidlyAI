function readAttribute(raw: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = raw.match(
    new RegExp(`(?:^|\\s)${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s]+))`, "i"),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

const MALFORMED_ACTION_TERMINATOR_PATTERN =
  /\[(?:\/?action)\s+type\s*=\s*(?:"none"|'none'|none)\s*\]/gi;

/** Repair the model's common `[action type="none"]` closing-marker mistake. */
export function normalizeActionProtocolMarkup(value: string) {
  const repaired = value.replace(
    /([[]action\b[^\]]*\])([\s\S]*?)\[(?:\/?action)\s+type\s*=\s*(?:"none"|'none'|none)\s*\]/gi,
    (whole, opener: string, body: string) =>
      /\[\/action\s*\]/i.test(body) ? whole : `${opener}${body}[/action]`,
  );
  return repaired.replace(MALFORMED_ACTION_TERMINATOR_PATTERN, "");
}

/** Convert the app's presentation markup and common Markdown into artifact-safe plain text. */
export function toPlainArtifactText(value: string) {
  return value
    .replace(
      /\[link\b([^\]]*)\]([\s\S]*?)\[\/link\]/gi,
      (_match, attributes: string, body: string) => {
        const label = readAttribute(attributes, "label").trim();
        const linkText = body.trim();
        if (!label) return linkText;
        return linkText && linkText !== label ? `${label}: ${linkText}` : label;
      },
    )
    .replace(
      /\[callout\b([^\]]*)\]([\s\S]*?)\[\/callout\]/gi,
      (_match, attributes: string, body: string) => {
        const title = readAttribute(attributes, "title").trim();
        return title ? `${title}\n${body}` : body;
      },
    )
    .replace(
      /\[\/?(?:callout|highlight|copy_block|color|question|action|generated_file|generated_image)\b[^\]]*\]/gi,
      "",
    )
    .replace(/\[image_design\b[^\]]*\][\s\S]*?\[\/image_design\]/gi, "")
    .replace(/A imagem de texto aceita até \d[\d.]* caracteres\.[\s\S]*$/i, "")
    .replace(/```[^\n]*\r?\n?/g, "")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, "")
    .split("\n")
    .map((line) =>
      line.includes("|")
        ? line
            .split("|")
            .map((cell) => cell.trim())
            .filter(Boolean)
            .join("  |  ")
        : line,
    )
    .join("\n")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
