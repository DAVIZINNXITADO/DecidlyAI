export const MAX_TEXT_IMAGE_CHARS = 5000;

const IMAGE_WIDTH = 1200;
const MIN_IMAGE_HEIGHT = 1024;
const MAX_IMAGE_HEIGHT = 8192;
const CONTENT_MAX_WIDTH = 920;
const OUTER_PADDING = 116;
const LINE_HEIGHT_FACTOR = 1.28;
const MIN_FONT_SIZE = 26;
const FONT_STACK = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

type Palette = {
  background: [string, string];
  ink: string;
  muted: string;
  accent: string;
  glow: string;
};
type Layout = "square" | "portrait" | "poster";
type Mood = "calm" | "energetic" | "technical" | "warm";
type TextImageDesign = {
  layout: Layout;
  palette: Palette;
  fontWeight: 600 | 700 | 800;
  alignment: CanvasTextAlign;
  eyebrow: string;
};

const PALETTES: Record<Mood, Palette> = {
  calm: {
    background: ["#0b1020", "#182c4b"],
    ink: "#f8fbff",
    muted: "#a7bad5",
    accent: "#70e1c1",
    glow: "rgba(112,225,193,.22)",
  },
  energetic: {
    background: ["#241044", "#751b5f"],
    ink: "#fff8ff",
    muted: "#edbce9",
    accent: "#ffd166",
    glow: "rgba(255,209,102,.24)",
  },
  technical: {
    background: ["#07151c", "#123c45"],
    ink: "#f2fffc",
    muted: "#9ed2cb",
    accent: "#62e6c4",
    glow: "rgba(98,230,196,.2)",
  },
  warm: {
    background: ["#371a18", "#8a4428"],
    ink: "#fff9ed",
    muted: "#f3c9a0",
    accent: "#ffd38a",
    glow: "rgba(255,211,138,.22)",
  },
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

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function chooseDesign(text: string): TextImageDesign {
  const normalized = normalize(text);
  const characters = countTextImageChars(text);
  const paragraphs = text.split(/\r?\n/).filter((line) => line.trim()).length;
  const isTechnical =
    /\b(api|codigo|código|dados|passo|processo|metodo|método|estrategia|lista|guia|tutorial|tecnologia|analise|análise)\b/.test(
      normalized,
    );
  const isEnergetic =
    /!|\b(agora|comece|conquiste|crie|mude|acredite|foco|sucesso|oferta|novidade)\b/.test(
      normalized,
    );
  const isWarm =
    /\b(amor|carinho|familia|família|amizade|sonho|coracao|coração|feliz|obrigad|saudade)\b/.test(
      normalized,
    );
  const mood: Mood = isTechnical
    ? "technical"
    : isEnergetic
      ? "energetic"
      : isWarm
        ? "warm"
        : "calm";
  const layout: Layout =
    characters <= 180 ? "square" : characters <= 720 && paragraphs <= 3 ? "portrait" : "poster";
  return {
    layout,
    palette: PALETTES[mood],
    fontWeight: characters <= 180 && paragraphs <= 3 ? 800 : 700,
    alignment: characters <= 420 && paragraphs <= 6 ? "center" : "left",
    eyebrow: isEnergetic
      ? "UMA IDEIA PARA AGIR"
      : isTechnical
        ? "DECIDLYAI · INSIGHT"
        : "DECIDLYAI",
  };
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  maxWidth: number,
  weight: number,
) {
  context.font = `${weight} ${fontSize}px ${FONT_STACK}`;
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
      if (context.measureText(word).width > maxWidth) {
        if (line) lines.push(line);
        line = "";
        let fragment = "";
        for (const character of Array.from(word)) {
          const candidate = `${fragment}${character}`;
          if (fragment && context.measureText(candidate).width > maxWidth) {
            lines.push(fragment);
            fragment = character;
          } else fragment = candidate;
        }
        line = fragment;
        continue;
      }
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth || !line) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    previousLineWasBlank = false;
  }
  return lines;
}

function roundedRect(
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

function drawBackground(
  context: CanvasRenderingContext2D,
  height: number,
  design: TextImageDesign,
) {
  const gradient = context.createLinearGradient(0, 0, IMAGE_WIDTH, height);
  gradient.addColorStop(0, design.palette.background[0]);
  gradient.addColorStop(1, design.palette.background[1]);
  context.fillStyle = gradient;
  context.fillRect(0, 0, IMAGE_WIDTH, height);

  const glow = context.createRadialGradient(
    IMAGE_WIDTH * 0.82,
    height * 0.16,
    10,
    IMAGE_WIDTH * 0.82,
    height * 0.16,
    height * 0.7,
  );
  glow.addColorStop(0, design.palette.glow);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, IMAGE_WIDTH, height);

  context.strokeStyle = "rgba(255,255,255,.09)";
  context.lineWidth = 2;
  roundedRect(context, 42, 42, IMAGE_WIDTH - 84, height - 84, 34);
  context.stroke();
}

export async function createTextImage(text: string): Promise<Blob> {
  const content = text.trim();
  if (!content) throw new Error("A IA não preparou o texto para a imagem.");
  if (countTextImageChars(content) > MAX_TEXT_IMAGE_CHARS)
    throw new Error(`A imagem de texto aceita até ${MAX_TEXT_IMAGE_CHARS} caracteres.`);

  const design = chooseDesign(content);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Este navegador não conseguiu preparar a imagem.");

  const initialFontSize = design.layout === "square" ? 72 : design.layout === "portrait" ? 60 : 52;
  const contentWidth = design.alignment === "center" ? 900 : CONTENT_MAX_WIDTH;
  let fontSize = initialFontSize;
  let lines = wrapCanvasText(context, content, fontSize, contentWidth, design.fontWeight);
  let lineHeight = fontSize * LINE_HEIGHT_FACTOR;
  let requiredHeight = Math.ceil(lines.length * lineHeight + OUTER_PADDING * 2 + 180);
  while (requiredHeight > MAX_IMAGE_HEIGHT && fontSize > MIN_FONT_SIZE) {
    fontSize -= 2;
    lines = wrapCanvasText(context, content, fontSize, contentWidth, design.fontWeight);
    lineHeight = fontSize * LINE_HEIGHT_FACTOR;
    requiredHeight = Math.ceil(lines.length * lineHeight + OUTER_PADDING * 2 + 180);
  }
  if (requiredHeight > MAX_IMAGE_HEIGHT)
    throw new Error(
      "O texto precisa de mais espaço do que cabe em uma imagem. Tente um texto mais curto.",
    );

  const targetHeight =
    design.layout === "square"
      ? MIN_IMAGE_HEIGHT
      : design.layout === "portrait"
        ? 1350
        : Math.max(1600, requiredHeight);
  const imageHeight = Math.min(MAX_IMAGE_HEIGHT, Math.max(targetHeight, requiredHeight));
  canvas.width = IMAGE_WIDTH;
  canvas.height = imageHeight;
  drawBackground(context, imageHeight, design);

  context.textAlign = design.alignment;
  context.textBaseline = "middle";
  context.font = `700 15px ${FONT_STACK}`;
  context.fillStyle = design.palette.accent;
  const headerX = design.alignment === "center" ? IMAGE_WIDTH / 2 : OUTER_PADDING;
  context.fillText(design.eyebrow, headerX, 112);

  const startY = imageHeight / 2 - ((lines.length - 1) * lineHeight) / 2 + 35;
  context.font = `${design.fontWeight} ${fontSize}px ${FONT_STACK}`;
  context.fillStyle = design.palette.ink;
  lines.forEach((line, index) =>
    context.fillText(
      line,
      design.alignment === "center" ? IMAGE_WIDTH / 2 : OUTER_PADDING,
      startY + index * lineHeight,
      contentWidth,
    ),
  );

  context.font = `600 14px ${FONT_STACK}`;
  context.fillStyle = design.palette.muted;
  context.fillText(
    "DECIDIR É FÁCIL · DECIDIR BEM É DECIDLYAI",
    design.alignment === "center" ? IMAGE_WIDTH / 2 : OUTER_PADDING,
    imageHeight - 104,
  );

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Não foi possível exportar a imagem de texto.")),
      "image/png",
    );
  });
}
