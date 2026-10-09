import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Globe2, Loader2, MessageCircle, Users } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { supabase } from "../lib/supabase";

type AnalyticsRow = {
  event_name: "page_view" | "auth_success" | "chat_topic";
  page_path: string;
  source_category: string;
  topic: string;
  event_count: number | string;
};

type GroupedCount = { label: string; count: number };
type DailyView = { event_day: string; event_count: number | string };

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
  head: () => ({ meta: [{ name: "robots", content: "noindex,nofollow" }] }),
});

const formatCount = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
const topicLabels: Record<string, string> = {
  work_and_study: "Trabalho e estudos",
  business_and_technology: "Negócios e tecnologia",
  decision_and_planning: "Decisões e planejamento",
  creative_and_media: "Criação e mídia",
  sports: "Esportes",
  other: "Outros assuntos",
};
const sourceLabels: Record<string, string> = {
  direct: "Acesso direto",
  google: "Google",
  bing: "Bing",
  yahoo: "Yahoo",
  duckduckgo: "DuckDuckGo",
  facebook: "Facebook",
  instagram: "Instagram",
  reddit: "Reddit",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  other_referrer: "Outras origens",
};

function AnalyticsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [dailyViews, setDailyViews] = useState<DailyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      const { data, error: invokeError } = await supabase.functions.invoke("site-analytics-admin", {
        body: { days },
      });
      if (cancelled) return;
      if (invokeError || data?.error) {
        setRows([]);
        setDailyViews([]);
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Não foi possível carregar as métricas. Verifique sua sessão e o acesso administrativo.",
        );
      } else {
        setRows(Array.isArray(data?.events) ? (data.events as AnalyticsRow[]) : []);
        setDailyViews(Array.isArray(data?.daily) ? (data.daily as DailyView[]) : []);
      }
      setLoading(false);
    })().catch(() => {
      if (cancelled) return;
      setError("Não foi possível conectar ao painel de métricas.");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const totals = useMemo(() => {
    const total = (name: AnalyticsRow["event_name"]) =>
      rows
        .filter((row) => row.event_name === name)
        .reduce((sum, row) => sum + Number(row.event_count || 0), 0);
    return {
      views: total("page_view"),
      logins: total("auth_success"),
      topics: total("chat_topic"),
    };
  }, [rows]);

  const sources = useMemo(
    () =>
      groupRows(
        rows,
        "source_category",
        "page_view",
        (value) => sourceLabels[value] ?? "Outras origens",
      ),
    [rows],
  );
  const pages = useMemo(
    () => groupRows(rows, "page_path", "page_view", (value) => value || "Outra rota"),
    [rows],
  );
  const topics = useMemo(
    () =>
      groupRows(rows, "topic", "chat_topic", (value) => topicLabels[value] ?? "Outros assuntos"),
    [rows],
  );
  const daysChart = useMemo(
    () =>
      dailyViews.map((row) => [row.event_day, Number(row.event_count || 0)] as const).slice(-14),
    [dailyViews],
  );

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/workspace"
              className="mb-4 inline-flex items-center gap-2 text-sm text-violet-200/70 transition hover:text-violet-100"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Voltar ao workspace
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
              Área administrativa
            </p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <BarChart3 className="text-violet-300" size={28} aria-hidden="true" /> Analytics
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Tendências agregadas do produto, sem conteúdo de conversa ou identificação de pessoas.
            </p>
          </div>
          <div
            className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1"
            aria-label="Período das métricas"
          >
            {([7, 30, 90] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={days === option}
                onClick={() => setDays(option)}
                className={`min-h-10 rounded-lg px-3 text-sm transition ${days === option ? "bg-violet-500 text-white" : "text-white/55 hover:text-white"}`}
              >
                {option} dias
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-rose-300/20 bg-rose-500/[0.08] p-4 text-sm leading-6 text-rose-100"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            className="flex min-h-64 items-center justify-center gap-3 text-sm text-white/55"
            role="status"
          >
            <Loader2 size={18} className="animate-spin text-violet-300" aria-hidden="true" />{" "}
            Carregando métricas agregadas…
          </div>
        ) : !error ? (
          <>
            <section
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              aria-label="Resumo do período"
            >
              <MetricCard
                icon={<Globe2 size={19} />}
                label="Visualizações de página"
                value={totals.views}
                note={`Eventos nos últimos ${days} dias`}
              />
              <MetricCard
                icon={<Users size={19} />}
                label="Logins concluídos"
                value={totals.logins}
                note="Contagem de eventos, não de pessoas únicas"
              />
              <MetricCard
                icon={<MessageCircle size={19} />}
                label="Mensagens por assunto"
                value={totals.topics}
                note="Uma categoria por mensagem; nunca o texto"
              />
            </section>

            <section className="mt-6 grid gap-4 xl:grid-cols-2">
              <Panel
                title="Visitas por dia"
                description="Visualizações de páginas, sem identificadores de sessão."
              >
                {daysChart.length ? (
                  <div
                    className="flex h-48 items-end gap-2 pt-5"
                    role="img"
                    aria-label="Gráfico de visualizações de página por dia"
                  >
                    {daysChart.map(([day, count]) => {
                      const max = Math.max(...daysChart.map(([, value]) => value), 1);
                      const height = Math.max(6, Math.round((count / max) * 100));
                      return (
                        <div
                          key={day}
                          className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                        >
                          <span className="text-[10px] text-white/45">{formatCount(count)}</span>
                          <div
                            className="w-full rounded-t-md bg-violet-400/80"
                            style={{ height: `${height}%` }}
                            title={`${day}: ${formatCount(count)} visitas`}
                          />
                          <span className="text-[9px] text-white/35">{day.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState text="Ainda não há visitas consentidas neste período." />
                )}
              </Panel>
              <Panel
                title="Principais assuntos"
                description="Categorias amplas inferidas localmente antes do envio; nenhum texto é transmitido."
              >
                <RankedBars
                  items={topics}
                  empty="Ainda não há categorias de conversa neste período."
                />
              </Panel>
              <Panel
                title="Origem das entradas"
                description="Plataforma agrupada que encaminhou a primeira página; domínios individuais não são armazenados."
              >
                <RankedBars
                  items={sources}
                  empty="Ainda não há categorias de origem neste período."
                />
              </Panel>
              <Panel
                title="Páginas mais visitadas"
                description="Rotas permitidas e normalizadas; parâmetros e caminhos não reconhecidos são descartados."
              >
                <RankedBars items={pages} empty="Ainda não há rotas visitadas neste período." />
              </Panel>
            </section>

            <p className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-xs leading-5 text-white/45">
              A coleta só ocorre após consentimento para cookies não essenciais. O armazenamento
              contém contagens agregadas por dia, rota, origem agrupada e categoria; não inclui IDs,
              e-mail, mensagens, prompts, IP, cookies de sessão ou visitantes únicos.
            </p>
          </>
        ) : null}
      </main>
    </AppShell>
  );
}

function groupRows(
  rows: AnalyticsRow[],
  key: "source_category" | "page_path" | "topic",
  eventName: AnalyticsRow["event_name"],
  label: (value: string) => string,
): GroupedCount[] {
  const totals = new Map<string, number>();
  rows
    .filter((row) => row.event_name === eventName)
    .forEach((row) => {
      const value = row[key] || "";
      if (key === "source_category" && !value) return;
      totals.set(value, (totals.get(value) ?? 0) + Number(row.event_count || 0));
    });
  return Array.from(totals.entries())
    .map(([value, count]) => ({ label: label(value), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function MetricCard({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#191323] p-5 shadow-lg shadow-black/10">
      <div className="flex items-center gap-2 text-sm text-white/55">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums">{formatCount(value)}</p>
      <p className="mt-1 text-xs leading-5 text-white/35">{note}</p>
    </article>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-h-64 rounded-2xl border border-white/[0.08] bg-[#191323] p-5 shadow-lg shadow-black/10">
      <h2 className="font-semibold text-white">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-white/40">{description}</p>
      {children}
    </section>
  );
}

function RankedBars({ items, empty }: { items: GroupedCount[]; empty: string }) {
  if (!items.length) return <EmptyState text={empty} />;
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <div className="mt-5 space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex justify-between gap-4 text-xs">
            <span className="truncate text-white/70">{item.label}</span>
            <span className="shrink-0 tabular-nums text-white/45">{formatCount(item.count)}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-white/[0.06]"
            role="progressbar"
            aria-label={item.label}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={item.count}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400"
              style={{ width: `${Math.max(3, (item.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="mt-8 text-sm text-white/35">{text}</p>;
}
