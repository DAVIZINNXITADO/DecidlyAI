export const MAX_TEXT_IMAGE_CHARS = 5000;
const IMAGE_WIDTH = 1200;
const SQUARE_IMAGE_SIZE = 1024;
const MAX_IMAGE_HEIGHT = 8192;
const TEXT_MAX_WIDTH = 920;
const VERTICAL_PADDING = 96;
const LINE_HEIGHT_FACTOR = 1.3;
const MIN_FONT_SIZE = 24;

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

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, fontSize: number) {
  context.font = `700 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const lines: string[] = [];
  let previousLineWasBlank = true;
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      if (!previousLineWasBlank && lines.length) lines.push("");
      previousLineWasBlank = true;
      continue;
    }
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      if (context.measureText(word).width > TEXT_MAX_WIDTH) {
        if (line) lines.push(line);
        line = "";
        let fragment = "";
        for (const character of Array.from(word)) {
          const candidate = `${fragment}${character}`;
          if (fragment && context.measureText(candidate).width > TEXT_MAX_WIDTH) {
            lines.push(fragment);
            fragment = character;
          } else {
            fragment = candidate;
          }
        }
        line = fragment;
        continue;
      }
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= TEXT_MAX_WIDTH || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    previousLineWasBlank = false;
  }
  return lines;
}

export async function createTextImage(text: string): Promise<Blob> {
  const content = text.trim();
  if (!content) throw new Error("A IA não preparou o texto para a imagem.");
  if (countTextImageChars(content) > MAX_TEXT_IMAGE_CHARS) {
    throw new Error(`A imagem de texto aceita até ${MAX_TEXT_IMAGE_CHARS} caracteres.`);
  }

  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_WIDTH;
  canvas.height = SQUARE_IMAGE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Este navegador não conseguiu preparar a imagem.");

  let fontSize = countTextImageChars(content) <= 220 ? 64 : 48;
  let lines = wrapCanvasText(context, content, fontSize);
  let lineHeight = fontSize * LINE_HEIGHT_FACTOR;
  let requiredHeight = Math.ceil(lines.length * lineHeight + VERTICAL_PADDING * 2);
  while (requiredHeight > MAX_IMAGE_HEIGHT && fontSize > MIN_FONT_SIZE) {
    fontSize -= 2;
    lines = wrapCanvasText(context, content, fontSize);
    lineHeight = fontSize * LINE_HEIGHT_FACTOR;
    requiredHeight = Math.ceil(lines.length * lineHeight + VERTICAL_PADDING * 2);
  }
  if (requiredHeight > MAX_IMAGE_HEIGHT) {
    throw new Error(
      "O texto precisa de mais espaço do que cabe em uma imagem. Tente um texto mais curto.",
    );
  }

  const imageHeight = Math.max(SQUARE_IMAGE_SIZE, requiredHeight);
  canvas.height = imageHeight;
  context.fillStyle = "rgb(20, 20, 20)";
  context.fillRect(0, 0, IMAGE_WIDTH, imageHeight);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#ffffff";
  context.font = `700 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

  const startY = imageHeight / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) =>
    context.fillText(line, IMAGE_WIDTH / 2, startY + index * lineHeight, TEXT_MAX_WIDTH),
  );

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível exportar a imagem de texto."));
    }, "image/png");
  });
}
