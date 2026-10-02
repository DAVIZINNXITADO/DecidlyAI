export const MAX_TEXT_IMAGE_CHARS = 220;
const IMAGE_SIZE = 1024;
const TEXT_MAX_WIDTH = 824;
const TEXT_MAX_HEIGHT = 680;

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, fontSize: number) {
  context.font = `700 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= TEXT_MAX_WIDTH || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function createTextImage(text: string): Promise<Blob> {
  const content = text.trim();
  if (!content) throw new Error("A IA não preparou o texto para a imagem.");
  if (content.length > MAX_TEXT_IMAGE_CHARS) {
    throw new Error(`A imagem de texto aceita até ${MAX_TEXT_IMAGE_CHARS} caracteres.`);
  }

  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_SIZE;
  canvas.height = IMAGE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Este navegador não conseguiu preparar a imagem.");

  context.fillStyle = "rgb(20, 20, 20)";
  context.fillRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#ffffff";

  let fontSize = 64;
  let lines = wrapCanvasText(context, content, fontSize);
  while (fontSize > 28 && (lines.length * fontSize * 1.25 > TEXT_MAX_HEIGHT || lines.some((line) => context.measureText(line).width > TEXT_MAX_WIDTH))) {
    fontSize -= 2;
    lines = wrapCanvasText(context, content, fontSize);
  }
  if (lines.length * fontSize * 1.25 > TEXT_MAX_HEIGHT) {
    throw new Error("O texto não cabe na imagem. Peça à IA uma frase mais curta.");
  }

  const lineHeight = fontSize * 1.25;
  const startY = IMAGE_SIZE / 2 - ((lines.length - 1) * lineHeight) / 2;
  context.font = `700 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  lines.forEach((line, index) => context.fillText(line, IMAGE_SIZE / 2, startY + index * lineHeight, TEXT_MAX_WIDTH));

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível exportar a imagem de texto."));
    }, "image/png");
  });
}
