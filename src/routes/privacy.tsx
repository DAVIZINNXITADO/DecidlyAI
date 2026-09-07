import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Database,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
});

function Privacy() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        {/* CABEÇALHO */}

        <div className="border-b border-slate-800 pb-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <p className="mt-6 text-sm font-semibold tracking-wider text-violet-400">
            LEGAL
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Política de Privacidade
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            Esta Política de Privacidade explica como o DecidlyAI coleta,
            utiliza e protege informações quando você utiliza nossa plataforma.
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
          <PrivacySection
            number="01"
            title="Informações que coletamos"
          >
            <p>
              Dependendo de como você utiliza o DecidlyAI, podemos coletar
              informações necessárias para fornecer, manter e melhorar nossos
              serviços.
            </p>

            <p>Essas informações podem incluir:</p>

            <ul className="list-disc space-y-2 pl-5">
              <li>
                Informações básicas da sua conta, como nome e endereço de
                e-mail;
              </li>

              <li>
                Informações fornecidas durante o processo de autenticação;
              </li>

              <li>
                Informações relacionadas às decisões, opções e conteúdos que
                você criar ou fornecer dentro da plataforma;
              </li>

              <li>
                Informações técnicas necessárias para o funcionamento,
                segurança e manutenção do serviço.
              </li>
            </ul>
          </PrivacySection>

          <PrivacySection
            number="02"
            title="Login com Google"
            icon={<UserCheck className="h-5 w-5" />}
          >
            <p>
              O DecidlyAI permite que você crie uma conta ou faça login
              utilizando sua conta do Google.
            </p>

            <p>
              Quando você escolhe fazer login com o Google, podemos receber
              determinadas informações disponibilizadas durante o processo de
              autenticação, como seu nome, endereço de e-mail e identificador
              da conta, dependendo das permissões que você autorizar.
            </p>

            <p>
              O DecidlyAI não recebe nem armazena a senha da sua conta do
              Google.
            </p>
          </PrivacySection>

          <PrivacySection
            number="03"
            title="Autenticação e infraestrutura com Supabase"
            icon={<Database className="h-5 w-5" />}
          >
            <p>
              O DecidlyAI utiliza o Supabase para fornecer serviços de
              autenticação e infraestrutura de suporte à plataforma.
            </p>

            <p>
              O Supabase pode processar determinadas informações relacionadas
              à conta e à autenticação, necessárias para gerenciar sessões de
              usuários com segurança e permitir o acesso à plataforma.
            </p>

            <p>
              Informações utilizadas pela plataforma podem ser processadas
              utilizando a infraestrutura fornecida pelo Supabase, quando
              necessário para o funcionamento do DecidlyAI.
            </p>
          </PrivacySection>

          <PrivacySection
            number="04"
            title="Como utilizamos suas informações"
          >
            <p>Podemos utilizar as informações coletadas para:</p>

            <ul className="list-disc space-y-2 pl-5">
              <li>Criar e manter sua conta;</li>
              <li>Autenticar seu acesso ao DecidlyAI;</li>
              <li>Fornecer os recursos e funcionalidades da plataforma;</li>

              <li>
                Armazenar e organizar informações relacionadas às suas
                decisões;
              </li>

              <li>
                Melhorar a segurança, estabilidade e desempenho do serviço;
              </li>

              <li>
                Responder a solicitações de suporte e comunicações relacionadas
                ao DecidlyAI.
              </li>
            </ul>
          </PrivacySection>

          <PrivacySection
            number="05"
            title="Suas decisões e conteúdos"
          >
            <p>
              As informações que você fornece ao criar, organizar ou analisar
              decisões são utilizadas para disponibilizar as funcionalidades da
              plataforma DecidlyAI.
            </p>

            <p>
              Recomendamos que você evite inserir informações pessoais
              sensíveis ou confidenciais que não sejam necessárias para utilizar
              o serviço.
            </p>
          </PrivacySection>

          <PrivacySection
            number="06"
            title="Compartilhamento de informações"
          >
            <p>
              O DecidlyAI não vende suas informações pessoais.
            </p>

            <p>
              Podemos utilizar serviços de terceiros necessários para o
              funcionamento da plataforma, incluindo serviços de autenticação,
              hospedagem, banco de dados e infraestrutura.
            </p>

            <p>
              Esses fornecedores podem processar informações apenas na medida
              necessária para fornecer seus serviços e apoiar o funcionamento do
              DecidlyAI.
            </p>

            <p>
              Também poderemos divulgar informações quando isso for exigido pela
              legislação aplicável ou quando for razoavelmente necessário para
              proteger a segurança, os direitos, os usuários ou o funcionamento
              do DecidlyAI.
            </p>
          </PrivacySection>

          <PrivacySection
            number="07"
            title="Segurança"
            icon={<LockKeyhole className="h-5 w-5" />}
          >
            <p>
              Adotamos medidas razoáveis para ajudar a proteger as informações
              processadas pelo DecidlyAI.
            </p>

            <p>
              No entanto, nenhum método de transmissão ou armazenamento de
              informações é completamente seguro. Embora trabalhemos para
              proteger suas informações, não podemos garantir segurança
              absoluta.
            </p>
          </PrivacySection>

          <PrivacySection
            number="08"
            title="Retenção de informações"
          >
            <p>
              Podemos manter determinadas informações enquanto sua conta estiver
              ativa ou pelo período necessário para fornecer nossos serviços,
              manter a segurança, cumprir obrigações legais ou resolver
              possíveis problemas.
            </p>

            <p>
              Os períodos de retenção podem variar conforme o tipo de informação
              e a finalidade para a qual ela é processada.
            </p>
          </PrivacySection>

          <PrivacySection
            number="09"
            title="Exclusão de conta e informações"
          >
            <p>
              Você poderá solicitar informações sobre sua conta ou solicitar a
              exclusão de determinadas informações, conforme os recursos
              disponíveis na plataforma e a legislação aplicável.
            </p>

            <p>
              Algumas informações poderão ser mantidas quando necessário para
              cumprir obrigações legais, prevenir abusos ou fraudes, resolver
              problemas técnicos ou proteger a segurança do serviço.
            </p>
          </PrivacySection>

          <PrivacySection
            number="10"
            title="Cookies e tecnologias semelhantes"
          >
            <p>
              O DecidlyAI pode utilizar cookies e tecnologias semelhantes para
              permitir funcionalidades essenciais da plataforma, manter sessões
              de autenticação, melhorar a experiência do usuário e compreender
              aspectos técnicos do funcionamento do serviço.
            </p>

            <p>
              Informações adicionais sobre a utilização de cookies estarão
              disponíveis em nossa Política de Cookies.
            </p>
          </PrivacySection>

          <PrivacySection
            number="11"
            title="Serviços de terceiros"
          >
            <p>
              O DecidlyAI pode utilizar serviços de terceiros para fornecer
              funcionalidades importantes para a plataforma.
            </p>

            <p>
              Atualmente, esses serviços incluem o Google para autenticação e o
              Supabase para autenticação e infraestrutura de suporte à
              plataforma.
            </p>

            <p>
              Serviços de terceiros podem possuir suas próprias políticas e
              práticas de privacidade. Recomendamos que os usuários consultem
              essas políticas quando apropriado.
            </p>
          </PrivacySection>

          <PrivacySection
            number="12"
            title="Alterações nesta Política de Privacidade"
          >
            <p>
              Esta Política de Privacidade poderá ser atualizada periodicamente
              para refletir alterações no DecidlyAI, em nossos serviços ou em
              requisitos legais aplicáveis.
            </p>

            <p>
              Quando esta política for atualizada, a data de última alteração
              exibida no início desta página também poderá ser modificada.
            </p>
          </PrivacySection>

          <PrivacySection
            number="13"
            title="Contato"
            icon={<Mail className="h-5 w-5" />}
          >
            <p>
              Caso você tenha dúvidas sobre esta Política de Privacidade ou
              sobre a forma como as informações são tratadas pelo DecidlyAI,
              entre em contato conosco:
            </p>

            <a
              href="mailto:decidlyia@outlook.com"
              className="inline-flex items-center gap-2 font-medium text-violet-400 transition hover:text-violet-300"
            >
              <Mail className="h-4 w-4" />
              decidedlyia@outlook.com
            </a>
          </PrivacySection>
        </div>
      </div>
    </AppShell>
  );
}

function PrivacySection({
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