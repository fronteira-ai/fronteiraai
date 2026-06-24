import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

const pageButtonClasses =
  "flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition";

// Paginador genérico, renderizado inteiramente com <Link> (SSR, indexável,
// funciona sem JavaScript) para ser reaproveitado por qualquer listagem
// futura (lojas, busca) além de /products.
export default function Pagination({ currentPage, totalPages, buildHref }: Props) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(currentPage, totalPages);

  return (
    <nav aria-label="Paginação" className="flex items-center justify-center gap-2">
      {currentPage > 1 ? (
        <Link
          href={buildHref(currentPage - 1)}
          aria-label="Página anterior"
          className={`${pageButtonClasses} border border-slate-700 text-slate-300 hover:border-blue-500 hover:text-white`}
        >
          <ChevronLeft size={16} />
        </Link>
      ) : (
        <span className={`${pageButtonClasses} cursor-not-allowed border border-slate-800 text-slate-600`}>
          <ChevronLeft size={16} />
        </span>
      )}

      {pages.map((page, index) =>
        page === "..." ? (
          <span key={`ellipsis-${index}`} className="px-1 text-slate-500">
            …
          </span>
        ) : (
          <Link
            key={page}
            href={buildHref(page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={
              page === currentPage
                ? `${pageButtonClasses} bg-blue-600 text-white`
                : `${pageButtonClasses} border border-slate-700 text-slate-300 hover:border-blue-500 hover:text-white`
            }
          >
            {page}
          </Link>
        )
      )}

      {currentPage < totalPages ? (
        <Link
          href={buildHref(currentPage + 1)}
          aria-label="Próxima página"
          className={`${pageButtonClasses} border border-slate-700 text-slate-300 hover:border-blue-500 hover:text-white`}
        >
          <ChevronRight size={16} />
        </Link>
      ) : (
        <span className={`${pageButtonClasses} cursor-not-allowed border border-slate-800 text-slate-600`}>
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}

function buildPageList(current: number, total: number): (number | "...")[] {
  const delta = 1;
  const pages: (number | "...")[] = [];

  for (let page = 1; page <= total; page++) {
    const withinWindow = page >= current - delta && page <= current + delta;

    if (page === 1 || page === total || withinWindow) {
      pages.push(page);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return pages;
}
