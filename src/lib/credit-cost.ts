export type OperationKind = "question" | "complex_response" | "web_search" | "file_upload" | "pdf_read" | "pdf_create" | "image" | "multi_ai";

export type CostInput = { kind: OperationKind; inputChars?: number; outputChars?: number; pages?: number; fileBytes?: number; models?: number };

const baseCosts: Record<OperationKind, number> = {
  question: 1,
  complex_response: 2,
  web_search: 2,
  file_upload: 1,
  pdf_read: 2,
  pdf_create: 3,
  image: 6,
  multi_ai: 2,
};

export function estimateOperationCost(input: CostInput) {
  const base = baseCosts[input.kind];
  const complexity = Math.ceil((input.inputChars ?? 0) / 1800) * 0.25 + Math.ceil((input.outputChars ?? 0) / 3000) * 0.25;
  const file = Math.ceil((input.fileBytes ?? 0) / (5 * 1024 * 1024)) * 0.5 + Math.ceil((input.pages ?? 0) / 10) * 0.5;
  const models = Math.max(0, (input.models ?? 1) - 1) * 1.5;
  const cost = Math.max(1, base + complexity + file + models);
  return { min: Math.floor(cost), max: Math.ceil(cost * 1.25), reserve: Math.ceil(cost * 1.25) };
}

export function classifyMessage(message: string): OperationKind {
  const normalized = message.toLowerCase();
  if (/pesquis|notícia|atual|fonte|preço|disponível hoje/.test(normalized)) return "web_search";
  if (message.length > 1200 || /analise profundamente|compare detalhadamente|plano completo/.test(normalized)) return "complex_response";
  return "question";
}

export const defaultLimits = { maxUploadBytes: 25 * 1024 * 1024, maxFilesPerTask: 5, maxPdfPages: 100, maxImagesPerTask: 5, maxConcurrentTasks: 1 } as const;
