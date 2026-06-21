import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Container from "@/components/ui/Container";

const columns = [
  {
    title: "Plataforma",
    links: [
      { name: "Produtos", href: "/products" },
      { name: "Lojas", href: "/stores" },
      { name: "Comparador", href: "/compare" },
      { name: "Categorias", href: "/#categorias" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { name: "IA de Compras", href: "/#ia" },
      { name: "Pesquisar", href: "/search" },
      { name: "Favoritos", href: "/favorites" },
      { name: "Histórico de Preços", href: "/price-history" },
    ],
  },
  {
    title: "ParaguAI",
    links: [
      { name: "Sobre", href: "/about" },
      { name: "Contato", href: "/contact" },
      { name: "Privacidade", href: "/privacy" },
      { name: "Termos", href: "/terms" },
    ],
  },
];

// Sem URLs reais de redes sociais ainda; mantidas como texto não-clicavel
// para nao linkar para enderecos inexistentes.
const socials = ["Instagram", "LinkedIn", "WhatsApp"];

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-[#050816]">
      <Container className="py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
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
                {column.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="inline-block transition-all duration-300 hover:translate-x-1 hover:text-white"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
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
