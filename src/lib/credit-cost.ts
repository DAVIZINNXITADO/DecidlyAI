export type OperationKind = "question" | "complex_response" | "pdf_create" | "image" | "text_image";

export type CostInput = { kind: OperationKind; inputChars?: number; outputChars?: number; pages?: number };

const baseCosts: Record<OperationKind, number> = {
  question: 1,
  complex_response: 2,
  pdf_create: 1,
  image: 2.5,
  text_image: 0.5,
};

export function estimateOperationCost(input: CostInput) {
  const base = baseCosts[input.kind];
  if (input.kind === "pdf_create" || input.kind === "image" || input.kind === "text_image") {
    return { min: base, max: base, reserve: base };
  }
  const complexity = Math.ceil((input.inputChars ?? 0) / 1800) * 0.25 + Math.ceil((input.outputChars ?? 0) / 3000) * 0.25;
  const pages = Math.ceil((input.pages ?? 0) / 8) * 0.5;
  const cost = Math.max(1, base + complexity + pages);
  return { min: Math.floor(cost), max: Math.ceil(cost * 1.25), reserve: Math.ceil(cost * 1.25) };
}

export function classifyMessage(message: string): OperationKind {
  const normalized = message.toLowerCase();
  if (message.length > 1200 || /analise profundamente|compare detalhadamente|plano completo/.test(normalized)) return "complex_response";
  return "question";
}

// Anexos do chat são processados no contexto da mensagem e não ficam públicos.
export const defaultLimits = {
  maxUploadBytes: 4 * 1024 * 1024,
  maxFilesPerTask: 3,
  maxPdfPages: 8,
  maxImagesPerTask: 1,
  maxConcurrentTasks: 1,
} as const;
