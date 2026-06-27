import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Container from "@/components/ui/Container";

type FooterLink = { name: string; href: string } | { name: string; soon: true };

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Plataforma",
    links: [
      { name: "Catálogo", href: "/products" },
      { name: "Buscar", href: "/search" },
      { name: "Categorias", href: "/#categorias" },
      { name: "Lojas", href: "/lojas" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { name: "IA de Compras", href: "/#ia" },
      { name: "Favoritos", soon: true },
      { name: "Histórico de Preços", soon: true },
      { name: "Alertas de Preço", soon: true },
    ],
  },
  {
    title: "Para Lojistas",
    links: [
      { name: "Cadastrar Loja", href: "/merchant/register" },
      { name: "Planos", href: "/para-lojistas#planos" },
      { name: "Central do Lojista", href: "/merchant/login" },
      { name: "Ajuda", soon: true },
    ],
  },
  {
    title: "ParaguAI",
    links: [
      { name: "Sobre nós", soon: true },
      { name: "Contato", soon: true },
      { name: "Privacidade", soon: true },
      { name: "Termos de Uso", soon: true },
    ],
  },
];

const socials = ["Instagram", "LinkedIn", "WhatsApp"];

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-[#050816]">
      <Container className="py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo size="md" />

            <p className="mt-5 max-w-xs text-sm leading-7 text-slate-400">
              A plataforma mais inteligente para pesquisar, comparar preços e
              comprar no Paraguai com ajuda da Inteligência Artificial.
            </p>

            <div className="mt-6 flex gap-4 text-sm text-slate-500">
              {socials.map((social) => (
                <span key={social}>{social}</span>
              ))}
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-5 text-sm font-semibold uppercase tracking-[2px] text-slate-500">
                {column.title}
              </h3>

              <ul className="space-y-3 text-slate-400">
                {column.links.map((link) =>
                  "soon" in link ? (
                    <li key={link.name} className="flex items-center gap-2">
                      <span className="opacity-50">{link.name}</span>
                      <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">
                        em breve
                      </span>
                    </li>
                  ) : (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="inline-block transition-all duration-300 hover:translate-x-1 hover:text-white"
                      >
                        {link.name}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-slate-800 pt-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ParaguAI • Todos os direitos reservados.</p>
          <p>Feito para quem compra na fronteira.</p>
        </div>
      </Container>
    </footer>
  );
}
