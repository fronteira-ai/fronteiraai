import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { SITE_URL } from "@/constants/routes";

// Sprint 2 — Legal. Termos escritos para o que o ParaguAI É hoje: um
// comparador de preços que lê ofertas públicas e leva o comprador ao site da
// loja. Deliberadamente NÃO trata de marketplace, intermediação de venda,
// pagamento, entrega, devolução ou garantia — nada disso existe no produto.
// Pontos que exigem parecer profissional estão marcados no próprio texto.
export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Regras de uso do ParaguAI: o que o comparador faz, o que não faz, e as responsabilidades de cada parte durante o Beta.",
  alternates: { canonical: `${SITE_URL}/termos` },
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

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <article className="mx-auto max-w-3xl px-6 pt-32 pb-24">
        <h1 className="text-4xl font-black">Termos de Uso</h1>
        <p className="mt-3 text-sm text-slate-500">
          Última atualização: {UPDATED_AT} · ParaguAI (Beta)
        </p>

        <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm text-amber-200/90">
          <strong className="font-semibold text-amber-200">O ParaguAI está em Beta.</strong>{" "}
          A cobertura de lojas e produtos ainda é parcial e cresce com o tempo. Estes termos
          descrevem o serviço como ele funciona hoje.
        </div>

        <Section title="1. O que é o ParaguAI">
          <p>
            O ParaguAI é um <strong className="text-white">comparador de preços</strong> de
            eletrônicos e informática de Ciudad del Este. Nossa proposta é simples: descobrir
            em qual loja o produto que você quer está mais barato — com o preço em real e a
            reputação da loja.
          </p>
          <p>
            Para isso, reunimos ofertas <strong className="text-white">publicamente
            disponíveis</strong> nos sites das lojas, organizamos esses dados e apresentamos a
            comparação. Ao clicar em uma oferta, você é levado ao site da loja para concluir a
            compra lá.
          </p>
        </Section>

        <Section title="2. O que o ParaguAI NÃO é">
          <p>Para evitar qualquer ambiguidade, o ParaguAI não:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>vende produtos, nem próprios nem de terceiros;</li>
            <li>processa pagamentos ou armazena dados de cartão;</li>
            <li>intermedeia, garante ou participa da relação de compra e venda;</li>
            <li>realiza entrega, troca, devolução ou atendimento pós-venda;</li>
            <li>oferece garantia sobre produtos anunciados pelas lojas;</li>
            <li>presta assessoria aduaneira, fiscal ou sobre limites de importação.</li>
          </ul>
          <p>
            A relação de consumo, quando existir, é sempre{" "}
            <strong className="text-white">entre você e a loja</strong>.
          </p>
        </Section>

        <Section title="3. Sobre preços e disponibilidade">
          <p>
            Os preços e a disponibilidade exibidos são{" "}
            <strong className="text-white">capturados periodicamente</strong> e podem estar
            desatualizados em relação ao site da loja. Sempre confirme o valor final, o estoque
            e as condições na própria loja antes de comprar.
          </p>
          <p>
            Valores convertidos para real são estimativas de referência, baseadas em cotação
            de câmbio, e não representam o valor efetivamente cobrado por qualquer meio de
            pagamento. O preço que vale é o da loja, no momento da compra.
          </p>
          <p>
            Fazemos um esforço genuíno para que os dados estejam corretos, mas não garantimos
            exatidão, completude ou atualidade de nenhuma informação de preço, estoque ou
            especificação.
          </p>
        </Section>

        <Section title="4. Como as comparações são feitas">
          <p>
            A ordenação e as recomendações são geradas por critérios automáticos e
            determinísticos — preço, disponibilidade, sinais de confiança da loja e histórico
            de variação. Quando o sistema não tem dados suficientes, ele diz isso em vez de
            apresentar uma conclusão sem base.
          </p>
          <p>
            <strong className="text-white">Não vendemos posição em ranking.</strong> Nenhuma
            loja pode pagar para aparecer primeiro. Se isso mudar, será divulgado de forma
            destacada e identificado como tal.
          </p>
          <p>
            A comparação entre lojas só é possível quando reconhecemos que anúncios diferentes
            se referem ao mesmo produto. Nem todo produto do catálogo tem comparação disponível.
          </p>
        </Section>

        <Section title="5. Uso da plataforma">
          <p>Você concorda em não:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>usar meios automatizados para extrair dados em massa da plataforma;</li>
            <li>tentar burlar limites de uso, autenticação ou controles de segurança;</li>
            <li>interferir no funcionamento do serviço ou sobrecarregá-lo deliberadamente;</li>
            <li>reproduzir o conteúdo do site de forma que o substitua comercialmente.</li>
          </ul>
          <p>
            Não é necessário criar conta para usar o comparador.
          </p>
        </Section>

        <Section title="6. Lojistas">
          <p>
            Lojistas podem criar conta para reivindicar sua loja e acompanhar métricas
            agregadas de interesse em suas ofertas. Ao reivindicar uma loja, o lojista declara
            ter legitimidade para representá-la, e é responsável pela veracidade das
            informações que fornecer.
          </p>
          <p>
            Podemos suspender uma conta que viole estes termos ou cuja legitimidade não se
            confirme.
          </p>
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200/90">
            <strong>Revisão jurídica pendente:</strong> não há, nesta fase, plano pago,
            cobrança ou contrato comercial com lojistas. Quando houver, exigirá termos
            próprios.
          </p>
        </Section>

        <Section title="7. Propriedade intelectual">
          <p>
            Marcas, nomes, imagens e descrições de produtos pertencem a seus respectivos
            titulares e são exibidos para fins de identificação e comparação. A organização, a
            comparação e os textos produzidos pelo ParaguAI são nossos.
          </p>
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200/90">
            <strong>Revisão jurídica pendente:</strong> tratamento de imagens de produto
            armazenadas em nossa infraestrutura e o regime aplicável à coleta de dados
            públicos de sites de terceiros.
          </p>
        </Section>

        <Section title="8. Limitação de responsabilidade">
          <p>
            O serviço é oferecido no estado em que se encontra, em fase Beta, sem garantia de
            disponibilidade contínua ou de ausência de erros.
          </p>
          <p>
            Não respondemos por decisões de compra tomadas com base nas informações do
            comparador, nem por qualquer aspecto da relação entre você e a loja — incluindo
            preço final, estoque, entrega, qualidade, garantia ou atendimento.
          </p>
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200/90">
            <strong>Revisão jurídica pendente:</strong> a extensão desta limitação frente ao
            Código de Defesa do Consumidor precisa de parecer profissional. Cláusulas de
            exclusão de responsabilidade têm eficácia restrita em relações de consumo no
            Brasil.
          </p>
        </Section>

        <Section title="9. Alterações">
          <p>
            Estes termos podem ser atualizados conforme o produto evolui. A data no topo indica
            a versão vigente, e mudanças relevantes serão sinalizadas na plataforma.
          </p>
        </Section>

        <Section title="10. Legislação aplicável e contato">
          <p>
            Aplica-se a legislação brasileira. Dúvidas podem ser encaminhadas pelos canais
            disponíveis em{" "}
            <Link href="/para-lojistas" className="text-blue-400 hover:text-blue-300">
              /para-lojistas
            </Link>
            .
          </p>
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200/90">
            <strong>Revisão jurídica pendente:</strong> identificação da pessoa jurídica
            responsável (razão social, CNPJ, endereço), foro de eleição e canal oficial de
            contato.
          </p>
        </Section>

        <p className="mt-12 text-sm text-slate-500">
          Veja também a{" "}
          <Link href="/privacidade" className="text-blue-400 hover:text-blue-300">
            Política de Privacidade
          </Link>
          .
        </p>
      </article>

      <Footer />
    </main>
  );
}
