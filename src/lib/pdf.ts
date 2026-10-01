import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function cleanFileName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${normalized || "decidlyai-documento"}.pdf`;
}

function wrapText(text: string, font: any, size: number, maxWidth: number) {
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

export async function downloadPdf(options: { title?: string; content: string; fileName?: string }) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 54;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const contentWidth = pageWidth - margin * 2;
  const title = options.title?.trim() || "Documento DecidlyAI";
  const content = options.content.trim() || "Documento criado pelo DecidlyAI.";
  const lines = wrapText(content, regular, 11, contentWidth);
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawHeader = () => {
    page.drawText("DecidlyAI", { x: margin, y, size: 10, font: bold, color: rgb(0.43, 0.25, 0.8) });
    y -= 32;
    page.drawText(title.slice(0, 110), { x: margin, y, size: 20, font: bold, color: rgb(0.12, 0.08, 0.18) });
    y -= 28;
    page.drawText(new Date().toLocaleDateString("pt-BR"), { x: margin, y, size: 9, font: regular, color: rgb(0.4, 0.36, 0.45) });
    y -= 30;
  };

  drawHeader();
  for (const line of lines) {
    if (y < margin + 28) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawHeader();
    }
    if (line) page.drawText(line, { x: margin, y, size: 11, font: regular, color: rgb(0.15, 0.12, 0.18) });
    y -= 17;
  }

  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = cleanFileName(options.fileName || title);
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
