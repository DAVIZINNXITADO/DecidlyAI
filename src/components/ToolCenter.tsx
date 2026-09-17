import { useRef, useState, type ChangeEvent } from "react";
import { ChevronLeft, FilePlus2, FileText, ImagePlus, Paperclip, Search, Sparkles, Upload, Wrench } from "lucide-react";

export type ToolId = "web_search" | "plugins" | "create_file" | "create_image" | "create_pdf" | "create_text" | "upload";
export type SelectedTool = { id: ToolId; label: string };

type Props = { selected: SelectedTool | null; onSelect: (tool: SelectedTool) => void; onClose: () => void; onFile: (event: ChangeEvent<HTMLInputElement>) => void };

const creationTools: Array<{ id: ToolId; label: string; icon: typeof FileText }> = [
  { id: "create_image", label: "Criar imagem", icon: ImagePlus },
  { id: "create_pdf", label: "Criar PDF", icon: FileText },
  { id: "create_text", label: "Criar texto", icon: FileText },
  { id: "create_file", label: "Criar arquivo", icon: FilePlus2 },
];

export function ToolCenter({ selected, onSelect, onClose, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [creationOpen, setCreationOpen] = useState(false);
  const activate = (tool: SelectedTool) => { onSelect(tool); onClose(); };
  const itemClass = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] text-white/78 transition hover:bg-violet-400/[0.13] hover:text-white";

  return <div className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-[238px] overflow-hidden rounded-2xl border border-white/10 bg-[#21152d]/[.98] p-1.5 shadow-2xl shadow-black/35 backdrop-blur-xl" role="menu" aria-label="Ferramentas">
    <input ref={inputRef} type="file" multiple className="hidden" onChange={onFile} />
    {!creationOpen ? <>
      <div className="flex items-center gap-2 border-b border-white/[0.08] px-3 py-2"><Wrench size={14} className="text-violet-300" /><span className="text-[11px] font-semibold text-white/65">Ferramentas</span></div>
      <button type="button" className={itemClass} onClick={() => activate({ id: "web_search", label: "Pesquisa avançada" })}><Search size={15} className="text-violet-300" /><span>Pesquisa avançada</span></button>
      <button type="button" className={`${itemClass} justify-between`} onClick={() => setCreationOpen(true)}><span className="flex items-center gap-2.5"><FilePlus2 size={15} className="text-violet-300" />Criar arquivo</span><span className="text-white/30">›</span></button>
      <button type="button" className={`${itemClass} opacity-45`} disabled title="Disponível em breve"><Sparkles size={15} className="text-violet-300" /><span>Plugins</span><span className="ml-auto text-[9px] uppercase tracking-wide text-white/35">Futuro</span></button>
      <button type="button" className={itemClass} onClick={() => inputRef.current?.click()}><Paperclip size={15} className="text-violet-300" /><span>Anexar arquivo</span></button>
    </> : <>
      <button type="button" className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] text-white/50 hover:text-white" onClick={() => setCreationOpen(false)}><ChevronLeft size={14} />Criar arquivo</button>
      {creationTools.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={itemClass} onClick={() => activate({ id, label })}><Icon size={15} className="text-violet-300" /><span>{label}</span></button>)}
    </>}
    {selected && <div className="mt-1 border-t border-white/[0.08] px-3 py-1.5 text-[10px] text-emerald-300/80">Ativo: {selected.label}</div>}
  </div>;
}
