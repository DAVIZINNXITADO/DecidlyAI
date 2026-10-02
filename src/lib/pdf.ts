import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toPlainArtifactText } from "./rich-markup";

export const MAX_PDF_CHARS = 12_000;
export const MAX_PDF_PAGES = 8;

function cleanFileName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${normalized || "decidlyai-documento"}.pdf`;
}

function safeHelveticaText(value: string) {
  const punctuation: Record<string, string> = {
    "“": '"',
    "”": '"',
    "‘": "'",
    "’": "'",
    "–": "-",
    "—": "-",
    "…": "...",
    "•": "-",
    "\u00a0": " ",
  };
  return Array.from(value, (character) => {
    if (punctuation[character]) return punctuation[character];
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint === 9 || codePoint === 10 || codePoint === 13) return character;
    if ((codePoint >= 32 && codePoint <= 126) || (codePoint >= 160 && codePoint <= 255))
      return character;
    if (codePoint >= 0x0100 && codePoint <= 0x024f) {
      return character
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7e]/g, "");
    }
    return "";
  }).join("");
}

function wrapText(
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
  maxWidth: number,
) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
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

export async function createPdfBlob(options: {
  title?: string;
  content: string;
  fileName?: string;
}) {
  const sourceContent = toPlainArtifactText(options.content);
  if (!sourceContent) throw new Error("A IA não preparou conteúdo para o PDF.");
  if (sourceContent.length > MAX_PDF_CHARS) {
    throw new Error(
      `O PDF pode ter até ${MAX_PDF_CHARS.toLocaleString("pt-BR")} caracteres. Peça uma versão mais curta.`,
    );
  }
  const unsupportedLetterOrNumber = Array.from(sourceContent).some((character) => {
    if (!/[\p{L}\p{N}]/u.test(character)) return false;
    const codePoint = character.codePointAt(0) ?? 0;
    return !(
      (codePoint >= 32 && codePoint <= 126) ||
      (codePoint >= 160 && codePoint <= 255) ||
      (codePoint >= 0x0100 && codePoint <= 0x024f)
    );
  });
  if (unsupportedLetterOrNumber) {
    throw new Error(
      "O PDF simples aceita texto em alfabeto latino. Peça à IA para adaptar o texto antes de exportar.",
    );
  }

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 54;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const contentWidth = pageWidth - margin * 2;
  const title = safeHelveticaText(options.title?.trim() || "Documento DecidlyAI").slice(0, 110);
  const content = safeHelveticaText(sourceContent);
  const lines = wrapText(content, regular, 11, contentWidth);
  const linesPerPage = 37;
  const pageCount = Math.max(1, Math.ceil(lines.length / linesPerPage));
  if (pageCount > MAX_PDF_PAGES) {
    throw new Error(`O PDF pode ter até ${MAX_PDF_PAGES} páginas. Peça um conteúdo mais curto.`);
  }

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  let linesOnPage = 0;
  const drawHeader = () => {
    page.drawText("DecidlyAI", { x: margin, y, size: 10, font: bold, color: rgb(0.43, 0.25, 0.8) });
    y -= 32;
    page.drawText(title || "Documento DecidlyAI", {
      x: margin,
      y,
      size: 20,
      font: bold,
      color: rgb(0.12, 0.08, 0.18),
    });
    y -= 28;
    page.drawText(new Date().toLocaleDateString("pt-BR"), {
      x: margin,
      y,
      size: 9,
      font: regular,
      color: rgb(0.4, 0.36, 0.45),
    });
    y -= 30;
  };

  drawHeader();
  for (const line of lines) {
    if (linesOnPage >= linesPerPage) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      linesOnPage = 0;
      drawHeader();
    }
    if (line)
      page.drawText(line, { x: margin, y, size: 11, font: regular, color: rgb(0.15, 0.12, 0.18) });
    y -= 17;
    linesOnPage += 1;
  }

  const bytes = await pdf.save();
  return {
    blob: new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    fileName: cleanFileName(options.fileName || title),
    pageCount,
  };
}
