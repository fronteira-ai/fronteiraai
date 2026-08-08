import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { SITE_URL } from "@/constants/routes";

// Sprint 2 — Legal. O conteúdo abaixo descreve EXCLUSIVAMENTE o que o código
// realmente faz hoje, auditado arquivo a arquivo:
//   - hooks/useAnalytics.ts ......... anonymous_id/session_id, device, idioma
//   - components/analytics/*.tsx .... GA4 e Clarity, ambos condicionais
//   - app/api/analytics/events ...... rate limit por IP, em memória
//   - lib/supabase/server.ts ........ cookies de sessão (admin/lojista)
//   - hooks/useFavorites.ts ......... favoritos em localStorage
// Nada aqui descreve coleta, compartilhamento ou tratamento que não exista
// no código. Os pontos que exigem parecer profissional estão marcados como
// "Revisão jurídica pendente" no próprio texto.
export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como o ParaguAI trata dados durante o Beta: o que é coletado, por quê, por quanto tempo e quais são os seus direitos.",
  alternates: { canonical: `${SITE_URL}/privacidade` },
  robots: { index: true, follow: true },
};

const UPDATED_AT = "8 de agosto de 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-slate-300">{children}</div>
    </section>
  );
}

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <article className="mx-auto max-w-3xl px-6 pt-32 pb-24">
        <h1 className="text-4xl font-black">Política de Privacidade</h1>
        <p className="mt-3 text-sm text-slate-500">
          Última atualização: {UPDATED_AT} · ParaguAI (Beta)
        </p>

        <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm text-amber-200/90">
          <strong className="font-semibold text-amber-200">O ParaguAI está em Beta.</strong>{" "}
          Esta política descreve exatamente o que a plataforma faz hoje. Ela será
          atualizada sempre que o produto mudar, e a data acima indica a versão vigente.
        </div>

        <Section title="1. Quem somos e o que fazemos">
          <p>
            O ParaguAI é um <strong className="text-white">comparador de preços</strong> de
            eletrônicos e informática de Ciudad del Este. Reunimos ofertas publicamente
            disponíveis em sites de lojas da região e mostramos onde cada produto está mais
            barato.
          </p>
          <p>
            Não vendemos produtos, não processamos pagamentos e não intermediamos compras.
            Quando você clica em uma oferta, é levado ao site da loja, onde valem as
            políticas dela — não as nossas.
          </p>
        </Section>

        <Section title="2. O que coletamos">
          <p className="font-semibold text-white">2.1. Navegação anônima (todos os visitantes)</p>
          <p>
            Para entender quais produtos e buscas são úteis, registramos eventos de uso
            associados a um <strong className="text-white">identificador aleatório</strong>{" "}
            gerado no seu navegador. Esse identificador não contém e não deriva de nome,
            e-mail, telefone ou qualquer dado pessoal — é um número aleatório guardado no
            seu próprio navegador.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>identificador anônimo e identificador de sessão (ambos aleatórios);</li>
            <li>tipo de dispositivo (computador, celular ou tablet), navegador e idioma;</li>
            <li>páginas visitadas, página de origem (referrer) e data/hora;</li>
            <li>
              qual produto, loja ou oferta foi visualizado ou clicado — incluindo o clique em{" "}
              <em>Ver oferta</em>, que nos diz quais comparações realmente ajudam.
            </li>
          </ul>
          <p>
            <strong className="text-white">Não registramos</strong> seu nome, e-mail, telefone,
            endereço, dados de pagamento nem o preço que você viu.
          </p>

          <p className="mt-5 font-semibold text-white">2.2. Endereço IP</p>
          <p>
            Seu IP é usado apenas, e temporariamente, para limitar abusos automatizados nas
            nossas APIs. Ele <strong className="text-white">não é gravado</strong> junto aos
            eventos de navegação.
          </p>

          <p className="mt-5 font-semibold text-white">2.3. Contas de lojista</p>
          <p>
            Lojistas que criam conta fornecem e-mail e senha (gerenciados pelo nosso provedor
            de autenticação) e os dados da loja que desejam reivindicar. Essa área é separada
            da experiência de quem compara preços.
          </p>
          <p className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-sm text-slate-400">
            Não existe cadastro de comprador no ParaguAI. Você não precisa criar conta, e não
            criamos uma para você.
          </p>
        </Section>

        <Section title="3. Armazenamento no seu navegador">
          <p>Guardamos no seu próprio navegador, e não em nossos servidores:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <code className="text-slate-200">paraguay_anon_id</code> e{" "}
              <code className="text-slate-200">paraguay_session_id</code> — os identificadores
              aleatórios descritos acima;
            </li>
            <li>seus produtos favoritos, se você marcar algum.</li>
          </ul>
          <p>
            Limpar os dados do site no seu navegador apaga todos eles, e um novo identificador
            anônimo é criado na próxima visita.
          </p>
          <p>
            <strong className="text-white">Cookies:</strong> hoje usamos cookies apenas para
            manter a sessão de lojistas e administradores autenticados. Quem apenas compara
            preços não recebe cookie de sessão.
          </p>
        </Section>

        <Section title="4. Serviços de terceiros">
          <p>
            A plataforma está preparada para usar Google Analytics 4 (com anonimização de IP
            ativada) e Microsoft Clarity, mas ambos só são carregados se as respectivas chaves
            estiverem configuradas. Enquanto não estiverem, nenhum script de terceiro de
            medição é carregado e nenhum cookie deles é criado.
          </p>
          <p>
            Usamos o Supabase como provedor de banco de dados e autenticação, e a Vercel para
            hospedagem.
          </p>
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200/90">
            <strong>Revisão jurídica pendente:</strong> transferência internacional de dados
            (Supabase e Vercel operam fora do Brasil) e a necessidade de banner de
            consentimento de cookies caso as ferramentas de medição sejam ativadas.
          </p>
        </Section>

        <Section title="5. Por que tratamos esses dados">
          <ul className="list-disc space-y-1 pl-5">
            <li>medir quais buscas e comparações são úteis, para melhorar o produto;</li>
            <li>detectar e conter uso automatizado abusivo;</li>
            <li>autenticar lojistas e administradores e proteger suas contas;</li>
            <li>
              informar a lojistas parceiros métricas <strong className="text-white">agregadas</strong>{" "}
              de interesse em suas ofertas — nunca dados que identifiquem uma pessoa.
            </li>
          </ul>
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200/90">
            <strong>Revisão jurídica pendente:</strong> enquadramento formal das bases legais
            da LGPD (Lei 13.709/2018) para cada finalidade acima.
          </p>
        </Section>

        <Section title="6. Compartilhamento">
          <p>
            <strong className="text-white">Não vendemos seus dados.</strong> Não compartilhamos
            dados de navegação com lojas de forma individualizada. O que um lojista parceiro
            pode ver são números agregados sobre suas próprias ofertas.
          </p>
          <p>
            Ao clicar em uma oferta, você sai do ParaguAI e passa a navegar no site da loja —
            que tem políticas próprias, pelas quais não respondemos.
          </p>
        </Section>

        <Section title="7. Retenção">
          <p>
            Eventos de navegação são mantidos de forma acumulativa para permitir comparações ao
            longo do tempo. Dados de conta de lojista permanecem enquanto a conta existir.
          </p>
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200/90">
            <strong>Revisão jurídica pendente:</strong> definição de prazo máximo de retenção e
            de política de descarte automático — ainda não implementados.
          </p>
        </Section>

        <Section title="8. Seus direitos">
          <p>
            A LGPD garante a você confirmação de tratamento, acesso, correção, anonimização,
            portabilidade e eliminação de dados pessoais, entre outros direitos.
          </p>
          <p>
            Como a navegação no ParaguAI é anônima, normalmente não temos como ligar os eventos
            registrados a uma pessoa específica — o que também significa que não conseguimos
            localizá-los a partir do seu nome ou e-mail. Você pode eliminar completamente esses
            identificadores limpando os dados do site no seu navegador.
          </p>
          <p>Se você tem conta de lojista, pode exercer seus direitos sobre os dados da conta.</p>
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200/90">
            <strong>Revisão jurídica pendente:</strong> canal formal de atendimento ao titular e
            indicação de encarregado (DPO), exigidos pela LGPD e ainda não definidos.
          </p>
        </Section>

        <Section title="9. Crianças e adolescentes">
          <p>
            O ParaguAI não é direcionado a menores de 18 anos e não coleta intencionalmente
            dados dessa faixa etária.
          </p>
        </Section>

        <Section title="10. Alterações e contato">
          <p>
            Mudanças nesta política serão publicadas nesta página, com atualização da data no
            topo. Enquanto um canal de contato dedicado não é publicado, dúvidas podem ser
            encaminhadas pelos canais disponíveis em{" "}
            <Link href="/para-lojistas" className="text-blue-400 hover:text-blue-300">
              /para-lojistas
            </Link>
            .
          </p>
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200/90">
            <strong>Revisão jurídica pendente:</strong> identificação do controlador (razão
            social, CNPJ e endereço) e canal oficial de contato do titular.
          </p>
        </Section>

        <p className="mt-12 text-sm text-slate-500">
          Veja também os{" "}
          <Link href="/termos" className="text-blue-400 hover:text-blue-300">
            Termos de Uso
          </Link>
          .
        </p>
      </article>

      <Footer />
    </main>
  );
}
