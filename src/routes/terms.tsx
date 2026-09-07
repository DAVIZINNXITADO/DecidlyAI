import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  LockKeyhole,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/terms")({
  component: Terms,
});

function Terms() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        {/* CABEÇALHO */}

        <div className="border-b border-slate-800 pb-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
            <FileText className="h-7 w-7" />
          </div>

          <p className="mt-6 text-sm font-semibold tracking-wider text-violet-400">
            LEGAL
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Termos de Uso
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            Estes Termos de Uso estabelecem as regras e condições para a
            utilização da plataforma DecidlyAI.
          </p>

          <div className="mt-6 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:gap-6">
            <p>
              Data de criação:{" "}
              <span className="font-medium text-slate-400">
                06/09/2026
              </span>
            </p>

            <p>
              Última alteração:{" "}
              <span className="font-medium text-slate-400">
                06/09/2026
              </span>
            </p>
          </div>
        </div>

        {/* CONTEÚDO */}

        <div className="mt-12 space-y-12">
          <TermsSection
            number="01"
            title="Aceitação dos Termos"
            icon={<CheckCircle2 className="h-5 w-5" />}
          >
            <p>
              Ao acessar ou utilizar o DecidlyAI, você concorda com estes Termos
              de Uso e com as demais políticas aplicáveis à plataforma.
            </p>

            <p>
              Caso você não concorde com estes termos, recomendamos que não
              utilize o DecidlyAI.
            </p>
          </TermsSection>

          <TermsSection number="02" title="Sobre o DecidlyAI">
            <p>
              O DecidlyAI é uma plataforma criada para ajudar usuários a
              organizar possibilidades, analisar opções e obter mais clareza
              durante processos de tomada de decisão.
            </p>

            <p>
              A plataforma pode apresentar análises, sugestões, informações e
              recursos de organização para auxiliar o usuário a refletir sobre
              suas opções.
            </p>
          </TermsSection>

          <TermsSection
            number="03"
            title="Responsabilidade pelas decisões"
            icon={<AlertCircle className="h-5 w-5" />}
          >
            <p>
              O DecidlyAI é uma ferramenta de apoio à organização e análise de
              decisões.
            </p>

            <p>
              As informações, sugestões ou análises apresentadas pela plataforma
              não devem ser interpretadas como garantia de resultados ou como
              substituição ao julgamento pessoal do usuário.
            </p>

            <p>
              Você é responsável pelas decisões que toma e pelas consequências
              relacionadas às suas escolhas.
            </p>
          </TermsSection>

          <TermsSection
            number="04"
            title="Conta do usuário"
            icon={<LockKeyhole className="h-5 w-5" />}
          >
            <p>
              Algumas funcionalidades do DecidlyAI podem exigir a criação de uma
              conta e a autenticação do usuário.
            </p>

            <p>
              Você é responsável por utilizar sua conta de forma adequada e por
              manter suas informações de acesso protegidas.
            </p>

            <p>
              Não utilize contas de outras pessoas sem autorização e não tente
              acessar áreas ou informações para as quais você não possui
              permissão.
            </p>
          </TermsSection>

          <TermsSection
            number="05"
            title="Login com serviços de terceiros"
          >
            <p>
              O DecidlyAI pode permitir a autenticação por meio de serviços de
              terceiros, como o Google.
            </p>

            <p>
              Ao utilizar esses serviços, você também poderá estar sujeito aos
              termos e políticas aplicáveis do respectivo fornecedor.
            </p>

            <p>
              O DecidlyAI não recebe nem armazena a senha da sua conta do
              Google.
            </p>
          </TermsSection>

          <TermsSection
            number="06"
            title="Uso adequado da plataforma"
          >
            <p>
              Você concorda em utilizar o DecidlyAI de maneira responsável e em
              conformidade com as leis aplicáveis.
            </p>

            <p>
              Não é permitido utilizar a plataforma para tentar prejudicar o
              funcionamento do serviço, interferir em outros usuários ou
              realizar atividades não autorizadas.
            </p>

            <p>
              Também não é permitido tentar obter acesso indevido a sistemas,
              contas, dados ou recursos relacionados ao DecidlyAI.
            </p>
          </TermsSection>

          <TermsSection
            number="07"
            title="Conteúdo fornecido pelo usuário"
          >
            <p>
              Você é responsável pelas informações e conteúdos que fornece ao
              utilizar o DecidlyAI.
            </p>

            <p>
              Recomendamos que você não insira informações pessoais sensíveis ou
              confidenciais que não sejam necessárias para utilizar a plataforma.
            </p>

            <p>
              Você também é responsável por garantir que possui o direito de
              utilizar e fornecer os conteúdos inseridos na plataforma.
            </p>
          </TermsSection>

          <TermsSection
            number="08"
            title="Disponibilidade do serviço"
          >
            <p>
              Trabalhamos para manter o DecidlyAI disponível e funcionando
              corretamente, mas não podemos garantir que o serviço estará
              disponível de forma contínua ou sem interrupções.
            </p>

            <p>
              O serviço poderá passar por manutenção, atualizações, melhorias ou
              alterações técnicas que podem afetar temporariamente sua
              disponibilidade.
            </p>
          </TermsSection>

          <TermsSection
            number="09"
            title="Alterações na plataforma"
          >
            <p>
              O DecidlyAI poderá adicionar, remover, modificar ou atualizar
              funcionalidades da plataforma ao longo do tempo.
            </p>

            <p>
              Algumas funcionalidades poderão ser alteradas, substituídas ou
              descontinuadas quando necessário para melhorar a plataforma ou por
              motivos técnicos, operacionais ou legais.
            </p>
          </TermsSection>

          <TermsSection
            number="10"
            title="Propriedade intelectual"
            icon={<ShieldCheck className="h-5 w-5" />}
          >
            <p>
              O DecidlyAI, incluindo sua identidade visual, nome, design,
              interface, textos e demais elementos originais da plataforma, é
              protegido pelas leis aplicáveis.
            </p>

            <p>
              Você não pode copiar, reproduzir, modificar ou utilizar elementos
              do DecidlyAI de maneira não autorizada.
            </p>
          </TermsSection>

          <TermsSection
            number="11"
            title="Limitação de responsabilidade"
            icon={<Scale className="h-5 w-5" />}
          >
            <p>
              O DecidlyAI é fornecido como uma ferramenta para auxiliar na
              organização e análise de informações.
            </p>

            <p>
              Não garantimos resultados específicos decorrentes da utilização da
              plataforma ou das decisões tomadas pelo usuário.
            </p>

            <p>
              Sempre que necessário, decisões importantes devem ser avaliadas com
              cuidado e, quando apropriado, com o apoio de profissionais
              qualificados.
            </p>
          </TermsSection>

          <TermsSection
            number="12"
            title="Suspensão ou encerramento de acesso"
          >
            <p>
              Poderemos limitar, suspender ou encerrar o acesso à plataforma
              quando houver uso indevido, tentativa de comprometer a segurança do
              serviço ou violação destes Termos de Uso.
            </p>

            <p>
              Essa medida poderá ser tomada quando necessária para proteger a
              plataforma, seus usuários ou sua infraestrutura.
            </p>
          </TermsSection>

          <TermsSection
            number="13"
            title="Privacidade e cookies"
          >
            <p>
              O tratamento de informações relacionadas à utilização do DecidlyAI
              é explicado em nossa Política de Privacidade.
            </p>

            <p>
              A utilização de cookies e tecnologias semelhantes é explicada em
              nossa Política de Cookies.
            </p>
          </TermsSection>

          <TermsSection
            number="14"
            title="Alterações nestes Termos"
          >
            <p>
              Estes Termos de Uso poderão ser atualizados periodicamente para
              refletir alterações na plataforma, em seus recursos ou em
              requisitos legais aplicáveis.
            </p>

            <p>
              Quando estes termos forem atualizados, a data de última alteração
              exibida no início desta página poderá ser modificada.
            </p>
          </TermsSection>

          <TermsSection number="15" title="Contato">
            <p>
              Caso você tenha dúvidas sobre estes Termos de Uso ou sobre a
              utilização do DecidlyAI, entre em contato conosco:
            </p>

            <a
              href="mailto:decidlyia@outlook.com"
              className="inline-flex font-medium text-violet-400 transition hover:text-violet-300"
            >
              decidedlyia@outlook.com
            </a>
          </TermsSection>
        </div>
      </div>
    </AppShell>
  );
}

function TermsSection({
  number,
  title,
  icon,
  children,
}: {
  number: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-slate-800 pb-12 last:border-0">
      <div className="flex items-start gap-5">
        <span className="pt-1 text-sm font-bold tracking-wider text-violet-400">
          {number}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {icon ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                {icon}
              </div>
            ) : null}

            <h2 className="text-2xl font-semibold text-white">
              {title}
            </h2>
          </div>

          <div className="mt-5 space-y-4 leading-relaxed text-slate-400">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}