import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, Check, Copy, Download, ExternalLink, FileText, Image as ImageIcon, Info, Lightbulb, Loader2, ShieldAlert, Sparkles, TriangleAlert, Type } from "lucide-react";
import { supabase } from "../lib/supabase";
import { normalizeActionProtocolMarkup, toPlainArtifactText } from "../lib/rich-markup";
import { MAX_TEXT_IMAGE_CHARS } from "../lib/text-image";

export type Variant = "info" | "success" | "warning" | "danger" | "tip" | "important" | "advantage" | "disadvantage" | "observation" | "recommendation" | "decision" | "neutral";
type Block = {
  kind: "markdown" | "callout" | "highlight" | "copy" | "link" | "action" | "question" | "color" | "file" | "image";
  value: string;
  variant?: Variant;
  color?: string;
  title?: string;
  language?: string;
  href?: string;
  actionType?: string;
  requestId?: string;
  path?: string;
  fileName?: string;
  alt?: string;
};
export type ResponseAction = { type: string; title: string; description: string; requestId: string };
type ArtifactResult = { kind: "file" | "image"; path: string; fileName?: string; alt?: string };

const variants: Record<Variant, { label: string; className: string; icon: ReactNode }> = {
  info: { label: "Informação", className: "border-sky-300/20 bg-sky-400/[0.08] text-sky-50", icon: <Info size={16} /> },
  success: { label: "Sucesso", className: "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-50", icon: <Check size={16} /> },
  advantage: { label: "Vantagens", className: "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-50", icon: <Check size={16} /> },
  disadvantage: { label: "Desvantagens", className: "border-rose-300/20 bg-rose-400/[0.08] text-rose-50", icon: <AlertTriangle size={16} /> },
  warning: { label: "Atenção", className: "border-amber-300/20 bg-amber-400/[0.08] text-amber-50", icon: <TriangleAlert size={16} /> },
  danger: { label: "Alerta", className: "border-rose-300/20 bg-rose-400/[0.08] text-rose-50", icon: <ShieldAlert size={16} /> },
  tip: { label: "Dica", className: "border-violet-300/20 bg-violet-400/[0.08] text-violet-50", icon: <Lightbulb size={16} /> },
  important: { label: "Importante", className: "border-fuchsia-300/20 bg-fuchsia-400/[0.08] text-fuchsia-50", icon: <Sparkles size={16} /> },
  observation: { label: "Observação", className: "border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-50", icon: <Info size={16} /> },
  recommendation: { label: "Recomendação", className: "border-violet-300/20 bg-violet-400/[0.08] text-violet-50", icon: <Lightbulb size={16} /> },
  decision: { label: "Decisão", className: "border-indigo-300/20 bg-indigo-400/[0.08] text-indigo-50", icon: <Sparkles size={16} /> },
  neutral: { label: "Nota", className: "border-white/15 bg-white/[0.05] text-white/85", icon: <Info size={16} /> },
};

const highlightColors: Record<string, string> = {
  yellow: "bg-yellow-300/25 text-yellow-50 ring-1 ring-yellow-300/30",
  amber: "bg-amber-300/25 text-amber-50 ring-1 ring-amber-300/30",
  green: "bg-emerald-300/25 text-emerald-50 ring-1 ring-emerald-300/30",
  blue: "bg-sky-300/25 text-sky-50 ring-1 ring-sky-300/30",
  cyan: "bg-cyan-300/25 text-cyan-50 ring-1 ring-cyan-300/30",
  purple: "bg-violet-300/25 text-violet-50 ring-1 ring-violet-300/30",
  pink: "bg-pink-300/25 text-pink-50 ring-1 ring-pink-300/30",
  red: "bg-rose-300/25 text-rose-50 ring-1 ring-rose-300/30",
};
const safeTextColors: Record<string, string> = { red: "#fb7185", orange: "#fb923c", yellow: "#fde047", green: "#86efac", blue: "#7dd3fc", cyan: "#67e8f9", purple: "#c4b5fd", pink: "#f9a8d4", white: "#ffffff" };

function normalizeLegacyMarkup(content: string) {
  return content
    .replace(/<font\s+color=["'](#[0-9a-f]{3,8}|[a-z]+)["']\s*>([\s\S]*?)<\/font>/gi, '[color color="$1"]$2[/color]')
    .replace(/<span\s+style=["'][^"']*color\s*:\s*(#[0-9a-f]{3,8}|[a-z]+)[^"']*["']\s*>([\s\S]*?)<\/span>/gi, '[color color="$1"]$2[/color]');
}

function keepOnlyRequestedAction(content: string) {
  content = normalizeActionProtocolMarkup(content);
  const action = content.match(/\[action(?:\s+[^\]]*)?\][\s\S]*?\[\/action\]/i);
  if (!action) return content;
  const supported = /type\s*=\s*["']?(create_pdf|create_image|create_text_image)["']?/i.test(action[0]);
  const remainingText = content.replace(action[0], "").trim();
  return supported ? action[0] : remainingText || "Essa ferramenta ainda não está disponível.";
}

function hideIncompleteActionTail(content: string) {
  const opening = content.lastIndexOf("[action");
  const closing = content.lastIndexOf("[/action]");
  return opening > closing ? content.slice(0, opening).trimEnd() : content;
}

function attributes(raw: string | undefined) {
  return Object.fromEntries(Array.from(raw?.matchAll(/([\w-]+)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/gi) ?? []).map((item) => [item[1]?.toLowerCase(), item[2] ?? item[3] ?? item[4] ?? ""]));
}

export function parseBlocks(content: string): Block[] {
  content = normalizeLegacyMarkup(hideIncompleteActionTail(keepOnlyRequestedAction(content)));
  const blocks: Block[] = [];
  const pattern = /\[(callout|highlight|copy_block|link|action|question|color|generated_file|generated_image)(?:\s+([^\]]+))?\]([\s\S]*?)\[\/(callout|highlight|copy_block|link|action|question|color|generated_file|generated_image)\]/gi;
  let cursor = 0;
  for (const match of content.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) blocks.push({ kind: "markdown", value: content.slice(cursor, start) });
    const rawKind = (match[1] ?? "callout").toLowerCase();
    const attr = attributes(match[2]);
    const value = (match[3] ?? "").trim();
    const blockEnd = start + match[0].length;
    if (rawKind === "action" && attr.type === "create_text_image") {
      const plainText = toPlainArtifactText(value);
      const tooLong = plainText.length > MAX_TEXT_IMAGE_CHARS;
      const missingRequestId = !(attr.request_id || attr.id);
      if (tooLong || missingRequestId) {
        const notice = tooLong
          ? `A imagem de texto aceita até ${MAX_TEXT_IMAGE_CHARS} caracteres. O conteúdo foi mantido como texto; nenhum crédito foi consumido.`
          : "A imagem não foi preparada nesta mensagem. O conteúdo foi mantido como texto.";
        blocks.push({ kind: "markdown", value: `${plainText}\n\n${notice}` });
        cursor = blockEnd;
        continue;
      }
    }
    const variant = attr.variant as Variant | undefined;
    const kind: Block["kind"] = rawKind === "copy_block" ? "copy" : rawKind === "generated_file" ? "file" : rawKind === "generated_image" ? "image" : rawKind as Block["kind"];
    const block: Block = { kind, value, variant: variant && variant in variants ? variant : "info", color: attr.color?.toLowerCase() };
    if (attr.title) block.title = attr.title;
    if (attr.language) block.language = attr.language;
    if (attr.href) block.href = attr.href;
    if (attr.type) block.actionType = attr.type;
    if (attr.request_id || attr.id) block.requestId = attr.request_id || attr.id;
    if (attr.path) block.path = attr.path;
    if (attr.name || attr.file_name) block.fileName = attr.name || attr.file_name;
    if (attr.alt) block.alt = attr.alt;
    if (rawKind === "link") block.title = attr.label || value;
    if (rawKind === "action") block.title = attr.title || "Ação da IA";
    blocks.push(block);
    cursor = blockEnd;
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

const actionCosts: Record<string, number> = { create_pdf: 1, create_image: 2.5, create_text_image: 0.5 };
const actionCostLabels: Record<string, string> = { create_pdf: "1 crédito por arquivo + custo normal do conteúdo da IA", create_image: "2,5 créditos", create_text_image: "0,5 crédito" };
const actionButtonCostLabels: Record<string, string> = { create_pdf: "1 crédito/PDF", create_image: "2,5 créditos", create_text_image: "0,5 crédito" };
const actionNames: Record<string, string> = { create_pdf: "Criar PDF", create_image: "Gerar imagem por IA", create_text_image: "Criar imagem de texto" };

function ActionBlock({ block, messageId, onActionRequest }: { block: Block; messageId?: string | undefined; onActionRequest?: ((action: ResponseAction, messageId: string) => Promise<void>) | undefined }) {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const type = block.actionType || "";
  const cost = actionCosts[type];
  const title = block.title || actionNames[type] || "Ação da IA";
  const requestId = block.requestId || "";
  const canRun = Boolean(cost && requestId && messageId && onActionRequest);
  const run = async () => {
    if (!canRun || !messageId || !onActionRequest) return;
    setBusy(true);
    setErrorMessage("");
    try {
      await onActionRequest({ type, title, description: block.value, requestId }, messageId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
      setBusy(false);
    }
  };
  const limit = type === "create_pdf" ? "Limite diário: 1/dia Free · 3/dia VIP · até 8 páginas" : type === "create_text_image" ? "Limite diário: 5/dia Free · 15/dia VIP · até 220 caracteres" : "Limite diário: 3/dia Free · 9/dia VIP · prompt até 1.500 caracteres";
  const Icon = type === "create_pdf" ? FileText : type === "create_text_image" ? Type : ImageIcon;
  return <div className="my-4 rounded-2xl border border-violet-300/20 bg-violet-400/[0.08] px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-100"><Sparkles size={16} />Ação pronta para executar</div><p className="mt-2 whitespace-pre-wrap text-sm text-white/80">{block.value}</p><p className="mt-2 text-[11px] text-white/45">{actionCostLabels[type] || "Custo por uso"} · {limit}</p><button type="button" disabled={!canRun || busy} onClick={() => void run()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60">{busy ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}{busy ? "Preparando…" : `${actionNames[type] || title} · ${actionButtonCostLabels[type] || "ver custo"}`}</button>{errorMessage && <p role="alert" className="mt-2 text-xs text-rose-200">{errorMessage}</p>}{!canRun && <p className="mt-2 text-xs text-white/40">Ação indisponível nesta conversa.</p>}</div>;
}

function useArtifactUrl(path?: string) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setUrl("");
    setFailed(false);
    if (!path) {
      setFailed(true);
      return () => { active = false; };
    }
    void supabase.storage.from("decidlyai-artifacts").createSignedUrl(path, 60 * 60).then(({ data, error }) => {
      if (!active) return;
      if (error || !data?.signedUrl) setFailed(true);
      else setUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [path]);
  return { url, failed };
}

function ArtifactBlock({ block, kind }: { block: Block; kind: ArtifactResult["kind"] }) {
  const { url, failed } = useArtifactUrl(block.path);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const fileName = block.fileName || (kind === "file" ? "DecidlyAI.pdf" : `DecidlyAI-imagem.${block.path?.toLowerCase().endsWith(".png") ? "png" : "jpg"}`);
  const downloadArtifact = async () => {
    if (!url || downloading) return;
    setDownloading(true);
    setDownloadError("");
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("download_failed");
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    } catch {
      setDownloadError("Não foi possível baixar o arquivo. Tente novamente.");
    } finally {
      setDownloading(false);
    }
  };
  if (failed) return <p role="alert" className="my-3 rounded-xl border border-rose-300/15 bg-rose-400/[0.06] px-3 py-2 text-xs text-rose-200">O arquivo não está disponível ou você não tem acesso a ele.</p>;
  if (!url) return <div className="my-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/60"><Loader2 size={14} className="animate-spin" />Abrindo arquivo privado…</div>;
  if (kind === "image") return <figure className="my-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20"><img src={url} alt={block.alt || "Imagem gerada"} className="max-h-[560px] w-full object-contain" loading="lazy" /><figcaption className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-2"><span className="text-xs text-white/55">{block.alt || "Imagem gerada"}</span><button type="button" onClick={() => void downloadArtifact()} disabled={downloading} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-violet-200 hover:bg-white/10 disabled:opacity-60">{downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}{downloading ? "Baixando…" : "Baixar"}</button></figcaption>{downloadError && <p role="alert" className="px-3 pb-2 text-xs text-rose-200">{downloadError}</p>}</figure>;
  return <div className="my-3 rounded-2xl border border-violet-300/15 bg-violet-400/[0.06] px-4 py-3"><div className="flex items-center gap-3"><FileText size={19} className="shrink-0 text-violet-200" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-violet-100">{fileName}</strong><span className="mt-0.5 block text-xs text-white/45">PDF privado · disponível nesta conversa</span></span><button type="button" onClick={() => void downloadArtifact()} disabled={downloading} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-60">{downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}{downloading ? "Baixando…" : "Baixar"}</button></div>{downloadError && <p role="alert" className="mt-2 text-xs text-rose-200">{downloadError}</p>}</div>;
}

export const RichResponse = memo(function RichResponse({ content, messageId, onActionRequest }: { content: string; messageId?: string; onActionRequest?: (action: ResponseAction, messageId: string) => Promise<void> }) {
  const blocks = useMemo(() => parseBlocks(content), [content]);
  return <div className="text-[15px] leading-7 text-white/90">{blocks.map((block, index) => {
    if (block.kind === "markdown") return <Markdown key={index}>{block.value}</Markdown>;
    if (block.kind === "copy") return <CopyBlock key={index} block={block} />;
    if (block.kind === "link") return <LinkBlock key={index} block={block} />;
    if (block.kind === "action") return <ActionBlock key={index} block={block} messageId={messageId} onActionRequest={onActionRequest} />;
    if (block.kind === "file" || block.kind === "image") return <ArtifactBlock key={index} block={block} kind={block.kind} />;
    if (block.kind === "question") return null;
    if (block.kind === "color") {
      const rawColor = block.color || "white";
      const color = safeTextColors[rawColor] || (/^#[0-9a-f]{3,8}$/i.test(rawColor) ? rawColor : safeTextColors["white"]);
      return <span key={index} style={{ color }}><Markdown>{block.value}</Markdown></span>;
    }
    const style = variants[block.variant || "info"];
    const highlightClass = block.kind === "highlight" && block.color ? highlightColors[block.color] : "";
    return <div key={index} className={`my-4 rounded-2xl border px-4 py-3 ${style.className} ${highlightClass}`}><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">{style.icon}<span>{block.title || style.label}</span></div><div className="mt-1 text-sm leading-6"><Markdown>{block.value}</Markdown></div></div>;
  })}</div>;
});

export function responseProtocolInstructions() {
  return [
    `DecidlyAI é principalmente uma IA de conversa; arquivos são ferramentas opcionais, acionadas pelo usuário.`,
    `PDF simples: até 12.000 caracteres/8 páginas; o arquivo custa 1 crédito por PDF, além do custo normal da resposta da IA pelo conteúdo; limite diário 1 Free ou 3 VIP.`,
    `Imagem profissional FLUX.1 Schnell 1024×1024: 2,5 créditos cada, prompt até 1.500 caracteres; limite 3/dia Free ou 9/dia VIP.`,
    `Imagem básica de texto em fundo #141414: 0,5 crédito cada, até 220 caracteres; limite 5/dia Free ou 15/dia VIP. As cotas por tipo são separadas; cada ação cria no máximo um artefato e ainda exige saldo suficiente.`,
    `Pedidos de redação, ensaio, fábula, conto ou texto completo são solicitações de conteúdo textual: escreva a obra integral no chat e nunca os converta em imagem. Imagem de texto serve apenas para frases curtas de até 220 caracteres.`,
    `Estes recursos não leem PDFs, não aceitam anexos, não pesquisam na web, não editam imagens e não devem ser prometidos como concluídos antes da ação terminar. Só prepare um bloco de ação se o usuário pediu explicitamente a ferramenta ou se uma ferramenta está selecionada; não execute nada por conta própria.`,
    `Para PDF, retorne exatamente um bloco [action type=create_pdf title="Criar PDF"]conteúdo final conciso[/action]. Para uma ilustração, retorne [action type=create_image title="Gerar imagem"]prompt visual final[/action]. Para renderizar palavras curtas sobre fundo escuro, retorne [action type=create_text_image title="Criar imagem de texto"]texto exato da imagem[/action].`,
    `Use sempre o fechamento exato [/action]. Nunca emita [action type="none"] nem deixe blocos de ação abertos; quando não houver ação compatível, responda diretamente em texto normal sem marcadores de ação.`,
    `O app adicionará um identificador idempotente; nunca invente um. Se faltar uma informação indispensável, faça uma única pergunta consolidada antes de criar o bloco. Não gere HTML, CSS ou JavaScript. Nunca afirme que o arquivo já foi criado antes de o usuário acionar e concluir a ação. Se a mensagem já tem informação suficiente, siga sem perguntas redundantes.`,
    `Use [question id=clarify]1. ...\n2. ...[/question] para uma única pergunta consolidada. Use [highlight variant=warning color=yellow]trecho importante[/highlight], [color color=red]texto colorido[/color], [link href="https://exemplo.com" label="Abrir página"]https://exemplo.com[/link] e [copy_block language=text]conteúdo[/copy_block] quando apropriado.`,
  ].join(" ");
}

export function flattenResponse(content: string) { return parseBlocks(content).map((block) => block.value).join("\n\n"); }
