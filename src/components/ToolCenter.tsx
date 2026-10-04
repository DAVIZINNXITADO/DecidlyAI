import { Check, FileText, Image as ImageIcon, Type, X } from "lucide-react";

export type ToolId = "create_pdf" | "create_image" | "create_text_image";
export type SelectedTool = { id: ToolId; label: string; cost: number; costLabel: string };

type Props = {
  selected: SelectedTool | null;
  onSelect: (tool: SelectedTool) => void;
  onClose: () => void;
};

const availableTools: Array<SelectedTool & { description: string; icon: typeof FileText }> = [
  {
    id: "create_pdf",
    label: "Criar PDF",
    cost: 1,
    costLabel: "crédito por arquivo",
    description: "A IA prepara a resposta e cria um PDF para baixar.",
    icon: FileText,
  },
  {
    id: "create_image",
    label: "Imagem por IA",
    cost: 2.5,
    costLabel: "créditos por imagem",
    description: "A IA interpreta o pedido e gera uma imagem visual.",
    icon: ImageIcon,
  },
  {
    id: "create_text_image",
    label: "Imagem de texto",
    cost: 0.5,
    costLabel: "0,5 crédito por imagem",
    description: "Cria uma arte visual com o texto que você informar.",
    icon: Type,
  },
];

export function ToolCenter({ selected, onSelect, onClose }: Props) {
  return (
    <div className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-[300px] overflow-hidden rounded-2xl border border-white/10 bg-[#21152d]/[.98] p-1.5 shadow-2xl shadow-black/35 backdrop-blur-xl" role="menu" aria-label="Ferramentas disponíveis">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-2">
        <span className="text-[11px] font-semibold text-white/65">Ferramentas opcionais</span>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-white/40 transition hover:bg-white/10 hover:text-white" aria-label="Fechar ferramentas"><X size={14} /></button>
      </div>
      {availableTools.map((tool) => {
        const isSelected = selected?.id === tool.id;
        const Icon = tool.icon;
        return <button key={tool.id} type="button" role="menuitemcheckbox" aria-checked={isSelected} onClick={() => { onSelect({ id: tool.id, label: tool.label, cost: tool.cost, costLabel: tool.costLabel }); onClose(); }} className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-[12px] text-white/80 transition hover:bg-violet-400/[0.13] hover:text-white">
          <Icon size={15} className="mt-0.5 shrink-0 text-violet-300" />
          <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className="font-medium">{tool.label}</strong><span className="shrink-0 text-[10px] text-violet-200">{tool.costLabel}</span></span><span className="mt-1 block text-[10px] leading-4 text-white/45">{tool.description}</span></span>
          {isSelected && <Check size={14} className="mt-0.5 shrink-0 text-emerald-300" />}
        </button>;
      })}
    </div>
  );
}
