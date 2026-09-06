import { createFileRoute } from "@tanstack/react-router";
import {
  Cookie,
  Database,
  LockKeyhole,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/cookies")({
  component: Cookies,
});

function Cookies() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        {/* CABEÇALHO */}

        <div className="border-b border-slate-800 pb-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
            <Cookie className="h-7 w-7" />
          </div>

          <p className="mt-6 text-sm font-semibold tracking-wider text-violet-400">
            LEGAL
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Política de Cookies
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
            Esta Política de Cookies explica como o
            DecidlyAI utiliza cookies e tecnologias
            semelhantes para fornecer, manter e
            melhorar nossa plataforma.
          </p>

          <p className="mt-5 text-sm text-slate-500">
            Última atualização: setembro de 2026
          </p>
        </div>

        {/* CONTEÚDO */}

        <div className="mt-12 space-y-12">
          {/* 01 */}

          <CookieSection
            number="01"
            title="O que são cookies?"
            icon={
              <Cookie className="h-5 w-5" />
            }
          >
            <p>
              Cookies são pequenos arquivos de dados que
              podem ser armazenados no seu dispositivo
              quando você visita um site ou utiliza uma
              plataforma online.
            </p>

            <p>
              Eles podem ser utilizados para lembrar
              determinadas informações, manter sessões
              de usuários e ajudar no funcionamento
              adequado dos serviços.
            </p>
          </CookieSection>

          {/* 02 */}

          <CookieSection
            number="02"
            title="Como o DecidlyAI utiliza cookies"
            icon={
              <Settings className="h-5 w-5" />
            }
          >
            <p>
              O DecidlyAI pode utilizar cookies e
              tecnologias semelhantes para garantir o
              funcionamento adequado da plataforma.
            </p>

            <p>
              Essas tecnologias podem ser utilizadas,
              por exemplo, para manter sua sessão,
              lembrar determinadas preferências e
              ajudar a fornecer uma experiência mais
              estável e segura.
            </p>
          </CookieSection>

          {/* 03 */}

          <CookieSection
            number="03"
            title="Cookies essenciais"
            icon={
              <ShieldCheck className="h-5 w-5" />
            }
          >
            <p>
              Alguns cookies e tecnologias semelhantes
              são necessários para o funcionamento
              básico do DecidlyAI.
            </p>

            <p>
              Esses recursos podem ser utilizados para
              permitir funcionalidades essenciais,
              manter sessões de autenticação e ajudar a
              proteger a segurança da plataforma.
            </p>

            <p>
              Por serem necessários para o
              funcionamento do serviço, determinados
              cookies essenciais podem continuar sendo
              utilizados mesmo quando você recusa
              cookies não essenciais.
            </p>
          </CookieSection>

          {/* 04 */}

          <CookieSection
            number="04"
            title="Cookies de autenticação"
            icon={
              <LockKeyhole className="h-5 w-5" />
            }
          >
            <p>
              O DecidlyAI utiliza serviços de
              autenticação para permitir que usuários
              criem contas e acessem suas sessões com
              segurança.
            </p>

            <p>
              Cookies ou tecnologias semelhantes podem
              ser utilizados para manter sua sessão
              autenticada e permitir o funcionamento
              correto dos recursos da sua conta.
            </p>

            <p>
              Esses recursos são importantes para que
              você possa permanecer conectado e utilizar
              as funcionalidades da plataforma.
            </p>
          </CookieSection>

          {/* 05 */}

          <CookieSection
            number="05"
            title="Serviços de terceiros"
            icon={
              <Database className="h-5 w-5" />
            }
          >
            <p>
              O DecidlyAI utiliza serviços de terceiros
              para fornecer determinadas
              funcionalidades importantes para a
              plataforma.
            </p>

            <p>
              Atualmente, isso pode incluir o Google
              para autenticação e o Supabase para
              autenticação e infraestrutura de suporte
              à plataforma.
            </p>

            <p>
              Esses serviços podem utilizar suas
              próprias tecnologias, cookies ou
              mecanismos semelhantes conforme
              necessário para fornecer suas
              funcionalidades.
            </p>

            <p>
              Recomendamos que você consulte as
              políticas dos respectivos serviços quando
              desejar obter mais informações sobre como
              eles utilizam dados e tecnologias
              semelhantes.
            </p>
          </CookieSection>

          {/* 06 */}

          <CookieSection
            number="06"
            title="Consentimento"
          >
            <p>
              Quando aplicável, o DecidlyAI poderá
              solicitar sua escolha em relação ao uso de
              cookies não essenciais.
            </p>

            <p>
              Você poderá aceitar ou recusar
              determinadas categorias de cookies não
              essenciais por meio do aviso de cookies
              disponibilizado na plataforma.
            </p>

            <p>
              A recusa de cookies não essenciais não
              impede a utilização dos cookies e
              tecnologias estritamente necessários para
              o funcionamento do serviço.
            </p>
          </CookieSection>

          {/* 07 */}

          <CookieSection
            number="07"
            title="Como armazenamos sua escolha"
          >
            <p>
              Quando você escolhe aceitar ou recusar
              cookies não essenciais, sua preferência
              pode ser armazenada localmente no seu
              navegador para que o aviso não seja
              exibido novamente a cada visita.
            </p>

            <p>
              Essa preferência pode permanecer
              armazenada até que você limpe os dados do
              navegador ou que alterações futuras no
              sistema de consentimento tornem
              necessário solicitar uma nova escolha.
            </p>
          </CookieSection>

          {/* 08 */}

          <CookieSection
            number="08"
            title="Gerenciamento de cookies"
          >
            <p>
              A maioria dos navegadores permite que
              você visualize, gerencie ou exclua
              cookies diretamente nas configurações do
              navegador.
            </p>

            <p>
              A remoção ou bloqueio de determinados
              cookies pode afetar o funcionamento de
              algumas funcionalidades que dependem de
              tecnologias essenciais para manter sua
              sessão ou preferências.
            </p>
          </CookieSection>

          {/* 09 */}

          <CookieSection
            number="09"
            title="Alterações nesta Política de Cookies"
          >
            <p>
              Esta Política de Cookies poderá ser
              atualizada periodicamente para refletir
              alterações no funcionamento do
              DecidlyAI, em suas tecnologias ou em
              requisitos legais aplicáveis.
            </p>

            <p>
              Quando esta política for atualizada, a
              data de última atualização exibida no
              início desta página também poderá ser
              modificada.
            </p>
          </CookieSection>

          {/* 10 */}

          <CookieSection
            number="10"
            title="Contato"
          >
            <p>
              Caso você tenha dúvidas sobre esta
              Política de Cookies ou sobre o uso de
              cookies e tecnologias semelhantes pelo
              DecidlyAI, entre em contato conosco:
            </p>

            <a
              href="mailto:decidlyia@outlook.com"
              className="inline-flex font-medium text-violet-400 transition hover:text-violet-300"
            >
              decidedlyia@outlook.com
            </a>
          </CookieSection>
        </div>
      </div>
    </AppShell>
  );
}

function CookieSection({
  number,
  title,
  icon,
  children,
}: {
  number: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
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