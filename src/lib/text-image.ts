export const MAX_TEXT_IMAGE_CHARS = 5000;
const DEFAULT_WIDTH_MM = 210;
const DEFAULT_HEIGHT_MM = 297;
const PX_PER_MM = 5.669;
const MAX_IMAGE_HEIGHT = 8192;
const MIN_FONT_SIZE = 18;
const FONT_STACKS: Record<string, string> = {
  sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

type TextImageDesign = {
  page: "A4" | "A3" | "square" | "custom";
  orientation: "portrait" | "landscape";
  widthMm: number;
  heightMm: number;
  marginMm: number;
  background: string;
  backgroundEnd: string;
  textColor: string;
  accentColor: string;
  font: "sans" | "serif" | "mono";
  weight: 400 | 500 | 600 | 700 | 800;
  align: CanvasTextAlign;
  fontRatio: number;
  lineHeight: number;
  eyebrow: string;
  footer: string;
  radius: number;
};

const DEFAULT_DESIGN: TextImageDesign = {
  page: "A4",
  orientation: "portrait",
  widthMm: DEFAULT_WIDTH_MM,
  heightMm: DEFAULT_HEIGHT_MM,
  marginMm: 18,
  background: "#ffffff",
  backgroundEnd: "#ffffff",
  textColor: "#111111",
  accentColor: "#111111",
  font: "sans",
  weight: 700,
  align: "center",
  fontRatio: 0.105,
  lineHeight: 1.25,
  eyebrow: "",
  footer: "",
  radius: 0,
};

export function countTextImageChars(text: string) {
  return Array.from(text).length;
}

export function fitTextImageText(text: string, maxCharacters: number) {
  const characters = Array.from(text.trim());
  if (characters.length <= maxCharacters) return characters.join("");
  const contentLimit = Math.max(0, maxCharacters - 1);
  const clipped = characters.slice(0, contentLimit).join("");
  const lastWordBoundary = clipped.lastIndexOf(" ");
  const content =
    lastWordBoundary >= contentLimit * 0.7 ? clipped.slice(0, lastWordBoundary) : clipped;
  return content.trimEnd() ? `${content.trimEnd()}…` : "…".slice(0, maxCharacters);
}

function safeColor(value: unknown, fallback: string) {
  return typeof value === "string" &&
    /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|transparent|white|black|red|blue|green|purple|violet|orange|yellow|pink|gray|grey)$/i.test(
      value.trim(),
    )
    ? value.trim()
    : fallback;
}

function gradientStops(value: unknown): [string, string] | null {
  if (typeof value !== "string") return null;
  const match = value.match(
    /(?:linear-gradient|gradient)\([^,]+,\s*(#[0-9a-f]{3,8}|[a-z]+)\s*,\s*(#[0-9a-f]{3,8}|[a-z]+)\s*\)/i,
  );
  return match?.[1] && match[2] ? [match[1], match[2]] : null;
}

function parseDesign(raw: string | undefined): TextImageDesign {
  if (!raw) return { ...DEFAULT_DESIGN };
  try {
    const input = JSON.parse(raw) as Record<string, unknown>;
    const page =
      input["page"] === "A3" || input["page"] === "square" || input["page"] === "custom"
        ? input["page"]
        : "A4";
    const orientation = input["orientation"] === "landscape" ? "landscape" : "portrait";
    const widthMm = clampNumber(input["widthMm"], page === "A4" ? DEFAULT_WIDTH_MM : 297, 80, 500);
    const heightMm = clampNumber(
      input["heightMm"],
      page === "A4" ? DEFAULT_HEIGHT_MM : 210,
      80,
      700,
    );
    const marginMm = clampNumber(input["marginMm"], DEFAULT_DESIGN.marginMm, 5, 60);
    const fontRatio = clampNumber(input["fontRatio"], DEFAULT_DESIGN.fontRatio, 0.025, 0.24);
    const weight = [400, 500, 600, 700, 800].includes(Number(input["weight"]))
      ? (Number(input["weight"]) as TextImageDesign["weight"])
      : DEFAULT_DESIGN.weight;
    const align =
      input["align"] === "left" || input["align"] === "right" ? input["align"] : "center";
    const gradient = gradientStops(input["background"]);
    return {
      page,
      orientation,
      widthMm:
        orientation === "landscape" && page !== "custom" ? Math.max(widthMm, heightMm) : widthMm,
      heightMm:
        orientation === "landscape" && page !== "custom" ? Math.min(widthMm, heightMm) : heightMm,
      marginMm,
      background: safeColor(
        input["backgroundStart"] ?? gradient?.[0] ?? input["background"],
        DEFAULT_DESIGN.background,
      ),
      backgroundEnd: safeColor(
        input["backgroundEnd"] ?? gradient?.[1],
        DEFAULT_DESIGN.backgroundEnd,
      ),
      textColor: safeColor(input["textColor"], DEFAULT_DESIGN.textColor),
      accentColor: safeColor(input["accentColor"], DEFAULT_DESIGN.accentColor),
      font: input["font"] === "serif" || input["font"] === "mono" ? input["font"] : "sans",
      weight,
      align,
      fontRatio,
      lineHeight: clampNumber(input["lineHeight"], DEFAULT_DESIGN.lineHeight, 1, 2),
      eyebrow:
        typeof input["eyebrow"] === "string"
          ? input["eyebrow"].slice(0, 80)
          : DEFAULT_DESIGN.eyebrow,
      footer:
        typeof input["footer"] === "string" ? input["footer"].slice(0, 120) : DEFAULT_DESIGN.footer,
      radius: clampNumber(input["radius"], DEFAULT_DESIGN.radius, 0, 80),
    };
  } catch {
    return { ...DEFAULT_DESIGN };
  }
}

function clampNumber(value: unknown, fallback: number, minimum: number, maximum: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

const TECHNICAL_NOTE_LINE =
  /^\s*(?:page|orientation|widthMm|heightMm|marginMm|background|backgroundEnd|textColor|accentColor|font|weight|align|fontRatio|lineHeight|eyebrow|footer|radius)\s*[:=]/i;

function removeTextImageNotebook(value: string) {
  return value
    .replace(/\[\s*image_design\b[^\]]*\][\s\S]*?\[\s*\/\s*image_design\s*\]/gi, "")
    .replace(/\{\s*["']?(?:page|orientation|widthMm|heightMm|marginMm)["']?\s*[:=][\s\S]*?\}/gi, "")
    .replace(/^\s*\[\s*image_design\b[^\]]*\][\s\S]*$/gim, "")
    .replace(/^\s*A imagem de texto aceita até \d[\d.]* caracteres\.[^\r\n]*$/gim, "")
    .replace(
      /A imagem de texto aceita até \d[\d.]* caracteres\.\s*O conteúdo foi mantido como texto e nenhum crédito foi consumido\.?/gi,
      "",
    )
    .split(/\r?\n/)
    .filter((line) => !TECHNICAL_NOTE_LINE.test(line))
    .filter(
      (line) =>
        !/^\s*(?:caracter[ií]sticas?|configura[cç][aã]o|design|papel|folha)\s*[:-]/i.test(line),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseTextImagePayload(value: string) {
  const match = value.match(/\[\s*image_design\b[^\]]*\]([\s\S]*?)\[\s*\/\s*image_design\s*\]/i);
  const rawText = match ? value.replace(match[0], "") : value;
  const text = removeTextImageNotebook(rawText)
    .replace(/\[\s*image_design\b[^\]]*\][\s\S]*?\[\s*\/\s*image_design\s*\]/gi, "")
    .replace(/^\s*\[\s*image_design\b[^\]]*\][\s\S]*$/gim, "")
    .replace(/A imagem de texto aceita até \d[\d.]* caracteres\.[\s\S]*$/i, "")
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*(?:caracter[ií]sticas?|configura[cç][aã]o|design|papel|folha)\s*[:-]/i.test(line),
    )
    .filter(
      (line) =>
        !/\b(?:widthMm|heightMm|fontRatio|backgroundEnd|textColor|accentColor)\b\s*[:=]/i.test(
          line,
        ),
    )
    .filter((line) => !/\bA4\b.*\b(?:orienta[cç][aã]o|margem|fundo|fonte)\b/i.test(line))
    .join("\n")
    .trim();
  return {
    text,
    design: match?.[1]?.trim(),
  };
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  maxWidth: number,
  design: TextImageDesign,
) {
  context.font = `${design.weight} ${fontSize}px ${FONT_STACKS[design.font]}`;
  const lines: string[] = [];
  let previousBlank = true;
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      if (!previousBlank && lines.length) lines.push("");
      previousBlank = true;
      continue;
    }
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (!line || context.measureText(candidate).width <= maxWidth) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    previousBlank = false;
  }
  return lines;
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

export async function createTextImage(text: string, rawDesign?: string): Promise<Blob> {
  const payload = parseTextImagePayload(text);
  const content = removeTextImageNotebook(payload.text);
  if (!content) throw new Error("A IA não preparou o texto para a imagem.");
  if (countTextImageChars(content) > MAX_TEXT_IMAGE_CHARS)
    throw new Error(`A imagem de texto aceita até ${MAX_TEXT_IMAGE_CHARS} caracteres.`);

  const design = parseDesign(rawDesign || payload.design);
  const widthMm =
    design.orientation === "landscape" ? Math.max(design.widthMm, design.heightMm) : design.widthMm;
  const heightMm =
    design.orientation === "landscape"
      ? Math.min(design.widthMm, design.heightMm)
      : design.heightMm;
  const width = Math.round(widthMm * PX_PER_MM);
  const height = Math.min(MAX_IMAGE_HEIGHT, Math.round(heightMm * PX_PER_MM));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Este navegador não conseguiu preparar a imagem.");

  const margin = Math.round(design.marginMm * PX_PER_MM);
  const contentWidth = Math.max(180, width - margin * 2);
  let fontSize = Math.max(MIN_FONT_SIZE, Math.round(width * design.fontRatio));
  let lines = wrapCanvasText(context, content, fontSize, contentWidth, design);
  let lineHeight = fontSize * design.lineHeight;
  const headerSpace = design.eyebrow ? Math.round(height * 0.1) : Math.round(height * 0.03);
  const footerSpace = design.footer ? Math.round(height * 0.08) : Math.round(height * 0.03);
  const maxTextHeight = height - margin * 2 - headerSpace - footerSpace;
  while (lines.length * lineHeight > maxTextHeight && fontSize > MIN_FONT_SIZE) {
    fontSize -= 2;
    lines = wrapCanvasText(context, content, fontSize, contentWidth, design);
    lineHeight = fontSize * design.lineHeight;
  }
  if (lines.length * lineHeight > maxTextHeight)
    throw new Error(
      "O texto não cabe na folha escolhida pela IA. Peça uma folha maior ou um texto mais curto.",
    );

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, design.background);
  background.addColorStop(1, design.backgroundEnd);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  context.fillStyle = "rgba(255,255,255,.045)";
  context.beginPath();
  context.arc(width * 0.86, height * 0.13, Math.min(width, height) * 0.3, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(255,255,255,.13)";
  context.lineWidth = Math.max(2, width / 600);
  drawRoundedRect(context, margin / 2, margin / 2, width - margin, height - margin, design.radius);
  context.stroke();

  context.textAlign = design.align;
  context.textBaseline = "middle";
  const textX =
    design.align === "left" ? margin : design.align === "right" ? width - margin : width / 2;
  if (design.eyebrow) {
    context.font = `600 ${Math.max(12, Math.round(width * 0.012))}px ${FONT_STACKS[design.font]}`;
    context.fillStyle = design.accentColor;
    context.fillText(design.eyebrow, textX, margin + headerSpace / 2);
  }

  context.font = `${design.weight} ${fontSize}px ${FONT_STACKS[design.font]}`;
  context.fillStyle = design.textColor;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) =>
    context.fillText(line, textX, startY + index * lineHeight, contentWidth),
  );

  if (design.footer) {
    context.font = `500 ${Math.max(11, Math.round(width * 0.01))}px ${FONT_STACKS[design.font]}`;
    context.fillStyle = design.accentColor;
    context.fillText(design.footer, textX, height - margin - footerSpace / 2);
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Não foi possível exportar a imagem de texto.")),
      "image/png",
    );
  });
}
