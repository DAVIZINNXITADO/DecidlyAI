import { Check, FileText, X } from "lucide-react";

export type ToolId = "create_pdf";
export type SelectedTool = { id: ToolId; label: string };

type Props = {
  selected: SelectedTool | null;
  onSelect: (tool: SelectedTool) => void;
  onClose: () => void;
};

const exportPdfTool: SelectedTool = {
  id: "create_pdf",
  label: "Exportar resposta em PDF",
};

export function ToolCenter({ selected, onSelect, onClose }: Props) {
  const isSelected = selected?.id === exportPdfTool.id;

  return (
    <div
      className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-[270px] overflow-hidden rounded-2xl border border-white/10 bg-[#21152d]/[.98] p-1.5 shadow-2xl shadow-black/35 backdrop-blur-xl"
      role="menu"
      aria-label="Ferramentas disponíveis"
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-2">
        <span className="text-[11px] font-semibold text-white/65">Disponível agora</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
          aria-label="Fechar ferramentas"
        >
          <X size={14} />
        </button>
      </div>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={isSelected}
        onClick={() => {
          onSelect(exportPdfTool);
          onClose();
        }}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[12px] text-white/80 transition hover:bg-violet-400/[0.13] hover:text-white"
      >
        <FileText size={15} className="shrink-0 text-violet-300" />
        <span className="flex-1">{exportPdfTool.label}</span>
        {isSelected && <Check size={14} className="text-emerald-300" />}
      </button>
      <p className="px-3 pb-2 pt-1 text-[10px] leading-4 text-white/40">
        Gera um PDF simples com o texto preparado pela IA. Ainda não lê PDFs enviados.
      </p>
    </div>
  );
}
