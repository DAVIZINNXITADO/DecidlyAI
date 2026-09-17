import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, Check, Copy, ExternalLink, Info, Lightbulb, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";

export type Variant = "info" | "success" | "warning" | "danger" | "tip" | "important" | "advantage" | "disadvantage";
type Block = { kind: "markdown" | "callout" | "highlight" | "copy" | "link" | "action"; value: string; variant?: Variant; title?: string; language?: string; href?: string; actionType?: string };
export type ResponseAction = { type: string; title: string; description: string };

const variants: Record<Variant, { label: string; className: string; icon: ReactNode }> = {
  info: { label: "Informação", className: "border-sky-300/20 bg-sky-400/[0.08] text-sky-50", icon: <Info size={16} /> },
  success: { label: "Sucesso", className: "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-50", icon: <Check size={16} /> },
  advantage: { label: "Vantagens", className: "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-50", icon: <Check size={16} /> },
  disadvantage: { label: "Desvantagens", className: "border-rose-300/20 bg-rose-400/[0.08] text-rose-50", icon: <AlertTriangle size={16} /> },
  warning: { label: "Atenção", className: "border-amber-300/20 bg-amber-400/[0.08] text-amber-50", icon: <TriangleAlert size={16} /> },
  danger: { label: "Alerta", className: "border-rose-300/20 bg-rose-400/[0.08] text-rose-50", icon: <ShieldAlert size={16} /> },
  tip: { label: "Dica", className: "border-violet-300/20 bg-violet-400/[0.08] text-violet-50", icon: <Lightbulb size={16} /> },
  important: { label: "Importante", className: "border-fuchsia-300/20 bg-fuchsia-400/[0.08] text-fuchsia-50", icon: <Sparkles size={16} /> },
};

function attributes(raw: string | undefined) {
  return Object.fromEntries(Array.from(raw?.matchAll(/(variant|title|language|href|label|type|description)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/gi) ?? []).map((item) => [item[1]?.toLowerCase(), item[2] ?? item[3] ?? item[4] ?? ""]));
}

export function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const pattern = /\[(callout|highlight|copy_block|link|action)(?:\s+([^\]]+))?\]([\s\S]*?)\[\/(callout|highlight|copy_block|link|action)\]/gi;
  let cursor = 0;
  for (const match of content.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) blocks.push({ kind: "markdown", value: content.slice(cursor, start) });
    const rawKind = (match[1] ?? "callout").toLowerCase();
    const attr = attributes(match[2]);
    const value = (match[3] ?? "").trim();
    const variant = attr.variant as Variant | undefined;
    const block: Block = { kind: rawKind === "copy_block" ? "copy" : rawKind as Block["kind"], value, variant: variant && variant in variants ? variant : "info" };
    if (attr.title) block.title = attr.title;
    if (attr.language) block.language = attr.language;
    if (attr.href) block.href = attr.href;
    if (attr.type) block.actionType = attr.type;
    if (rawKind === "link") block.title = attr.label || value;
    if (rawKind === "action") block.title = attr.title || value;
    blocks.push(block);
    cursor = start + match[0].length;
  }
  if (cursor < content.length) blocks.push({ kind: "markdown", value: content.slice(cursor) });
  return blocks.length ? blocks : [{ kind: "markdown", value: content }];
}

function Markdown({ children }: { children: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
    h2: ({ children }) => <h2 className="mb-3 mt-5 text-lg font-semibold text-violet-100">{children}</h2>,
    h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-violet-200">{children}</h3>,
    ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
    li: ({ children }) => <li>{children}</li>,
    blockquote: ({ children }) => <blockquote className="my-3 rounded-2xl border-l-4 border-emerald-400 bg-emerald-400/[0.08] px-4 py-3 text-[14px] text-emerald-50">{children}</blockquote>,
    pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/25 p-4 text-[13px] leading-6 text-violet-100">{children}</pre>,
    code: ({ children }) => <code className="rounded-md bg-white/10 px-1.5 py-0.5 text-sm">{children}</code>,
    a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-violet-300 underline underline-offset-2">{children}</a>,
  }}>{children}</ReactMarkdown>;
}

function CopyBlock({ block }: { block: Block }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard?.writeText(block.value); setCopied(true); window.setTimeout(() => setCopied(false), 1400); };
  return <div className="my-4 overflow-hidden rounded-2xl border border-white/10 bg-black/25"><div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-white/45"><span>{block.language || "texto"}</span><button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-white/65 hover:bg-white/10 hover:text-white">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copiado" : "Copiar"}</button></div><pre className="max-h-96 overflow-auto whitespace-pre-wrap p-4 text-[13px] leading-6 text-violet-100">{block.value}</pre></div>;
}

function LinkBlock({ block }: { block: Block }) {
  return <a href={block.href || "#"} target="_blank" rel="noreferrer" className="my-3 flex items-center gap-3 rounded-2xl border border-sky-300/15 bg-sky-400/[0.06] px-4 py-3 transition hover:border-sky-300/35 hover:bg-sky-400/[0.12]"><ExternalLink size={17} className="shrink-0 text-sky-300" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-sky-100">{block.title || "Abrir link"}</strong><span className="mt-0.5 block truncate text-xs text-white/40">{block.href}</span></span><span className="text-[10px] text-amber-200/75">Atenção: site externo</span></a>;
}

function ActionBlock({ block, onActionRequest }: { block: Block; onActionRequest?: (action: ResponseAction) => void }) {
  const [requested, setRequested] = useState(false);
  const action = { type: block.actionType || "tool", title: block.title || "Ação da IA", description: block.value };
  return <div className="my-4 rounded-2xl border border-violet-300/20 bg-violet-400/[0.08] px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-100"><Sparkles size={16} />Permissão necessária</div><p className="mt-2 text-sm text-white/80">{action.description}</p><button type="button" disabled={requested} onClick={() => { setRequested(true); onActionRequest?.(action); }} className="mt-3 rounded-xl bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-60">{requested ? "Autorizado" : `Permitir ${action.title}`}</button></div>;
}

export function RichResponse({ content, onActionRequest }: { content: string; onActionRequest?: (action: ResponseAction) => void }) {
  return <div className="text-[15px] leading-7 text-white/90">{parseBlocks(content).map((block, index) => {
    if (block.kind === "markdown") return <Markdown key={index}>{block.value}</Markdown>;
    if (block.kind === "copy") return <CopyBlock key={index} block={block} />;
    if (block.kind === "link") return <LinkBlock key={index} block={block} />;
    if (block.kind === "action") return <ActionBlock key={index} block={block} onActionRequest={onActionRequest} />;
    const style = variants[block.variant || "info"];
    return <div key={index} className={`my-4 rounded-2xl border px-4 py-3 ${style.className}`}><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">{style.icon}<span>{block.title || style.label}</span></div><div className="mt-1 text-sm leading-6"><Markdown>{block.value}</Markdown></div></div>;
  })}</div>;
}

export function responseProtocolInstructions() {
  return "Você tem autonomia para perguntar quando uma informação realmente mudar a qualidade da resposta: [question id=clarify]sua pergunta[/question]. Você pode usar emojis com moderação. Para visual, use somente: [callout variant=advantage title=Vantagens]texto[/callout], [callout variant=disadvantage title=Desvantagens]texto[/callout], [highlight variant=warning]trecho importante[/highlight], ou marcações personalizadas seguras [highlight variant=info title=Observação]texto[/highlight]. Para links, use [link href=\"https://exemplo.com\" label=\"Abrir página\"]https://exemplo.com[/link]. Antes de criar algo ou executar uma ação externa, peça autorização: [action type=create_image title=\"criar a imagem\"]Posso criar esta imagem para você?[/action], ou use create_pdf, create_file. Para reutilização, use [copy_block language=text]conteúdo[/copy_block]. Não gere HTML, CSS ou JavaScript.";
}

export function flattenResponse(content: string) { return parseBlocks(content).map((block) => block.value).join("\n\n"); }
