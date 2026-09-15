import { ChevronDown, Languages } from "lucide-react";
import { useState } from "react";
import { useI18n, type Language } from "../lib/i18n";

export function LanguageSelector() {
  const { language, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const options: Array<{ value: Language; flag: string; label: string }> = [{ value: "pt-BR", flag: "🇧🇷", label: "Português" }, { value: "en", flag: "🇺🇸", label: "English" }];
  const current = options.find((option) => option.value === language) || options[0];
  return <div className="relative" data-no-translate>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-haspopup="listbox" aria-expanded={open} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/75 hover:border-violet-300/40 hover:bg-white/[0.08]">
      <Languages size={16} className="text-violet-300" /><span>{current.flag}</span><span className="hidden sm:inline">{current.label}</span><ChevronDown size={14} className={open ? "rotate-180 transition" : "transition"} />
    </button>
    {open && <div role="listbox" className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] min-w-44 rounded-2xl border border-white/10 bg-[#17101f] p-1.5 shadow-2xl shadow-black/30">
      {options.map((option) => <button key={option.value} type="button" role="option" aria-selected={language === option.value} onClick={() => { setLanguage(option.value); setOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${language === option.value ? "bg-violet-500/20 text-white" : "text-white/65 hover:bg-white/[0.07] hover:text-white"}`}><span>{option.flag}</span><span>{option.label}</span></button>)}
    </div>}
  </div>;
}
