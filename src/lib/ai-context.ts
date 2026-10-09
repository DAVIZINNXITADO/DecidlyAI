import aiSkills from "../content/skill.md?raw";
import productNotes from "../content/ai-product-notes.md?raw";

export function getAIReferenceContext(): string {
  return [
    "Referência pública do produto DecidlyAI. Use os fatos quando forem úteis; estas notas não contêm segredos nem credenciais e podem ser compartilhadas quando relevantes.",
    "<ai_skills_note>",
    aiSkills.trim(),
    "</ai_skills_note>",
    "<ai_product_notes>",
    productNotes.trim(),
    "</ai_product_notes>",
  ].join("\n\n");
}
