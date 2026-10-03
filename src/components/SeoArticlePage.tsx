import { Link } from "@tanstack/react-router";
import { InnerPage } from "./InnerPage";
import type { FaqEntry } from "../lib/seo";

export type SeoArticleSection = {
  heading: string;
  paragraphs: string[];
  points?: string[];
};

export function SeoFaqSection({
  items,
  eyebrow = "PERGUNTAS FREQUENTES",
  title = "Dúvidas frequentes",
}: {
  items: FaqEntry[];
  eyebrow?: string;
  title?: string;
}) {
  return (
    <section className="mt-10" aria-labelledby="faq-heading">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">{eyebrow}</p>
      <h2 id="faq-heading" className="mt-3 text-2xl font-semibold text-white">
        {title}
      </h2>
      <div className="mt-5 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.025] px-5">
        {items.map((item) => (
          <details key={item.question} className="group py-4">
            <summary className="cursor-pointer list-none font-medium text-white marker:hidden [&::-webkit-details-marker]:hidden">
              {item.question}
            </summary>
            <p className="max-w-3xl pt-3 text-sm leading-7 text-white/60">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function SeoArticlePage({
  eyebrow,
  title,
  description,
  sections,
  faqs,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sections: SeoArticleSection[];
  faqs: FaqEntry[];
}) {
  return (
    <InnerPage eyebrow={eyebrow} title={title} description={description} backTo="/">
      <article className="space-y-8">
        {sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-2xl font-semibold leading-snug text-white">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="leading-7 text-white/65">
                {paragraph}
              </p>
            ))}
            {section.points && (
              <ul className="list-disc space-y-2 pl-6 leading-7 text-white/65 marker:text-violet-300">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <SeoFaqSection items={faqs} />
        <nav aria-label="Conteúdos relacionados" className="border-t border-white/10 pt-7">
          <h2 className="text-xl font-semibold text-white">Continue sua reflexão</h2>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              to="/ia-para-empreendedores"
              className="rounded-full border border-violet-300/20 px-4 py-2 text-violet-100 transition hover:bg-violet-300/10"
            >
              IA para empreendedores
            </Link>
            <Link
              to="/como-tomar-decisoes-dificeis"
              className="rounded-full border border-violet-300/20 px-4 py-2 text-violet-100 transition hover:bg-violet-300/10"
            >
              Decisões difíceis
            </Link>
            <Link
              to="/ajuda-para-escolher-faculdade"
              className="rounded-full border border-violet-300/20 px-4 py-2 text-violet-100 transition hover:bg-violet-300/10"
            >
              Escolher faculdade
            </Link>
            <Link
              to="/blog"
              className="rounded-full border border-white/10 px-4 py-2 text-white/70 transition hover:bg-white/[0.05]"
            >
              Blog
            </Link>
          </div>
        </nav>
      </article>
    </InnerPage>
  );
}
