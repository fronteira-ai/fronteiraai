import { memo } from "react";
import Link from "next/link";
import { SITE_URL } from "@/constants/routes";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
};

// Trilha de navegação reutilizável entre /product/[slug], /store/[slug] e
// /products, com JSON-LD BreadcrumbList embutido (SEO). "Início" é sempre o
// primeiro item; o último item nunca é link (página atual).
function Breadcrumb({ items }: Props) {
  const allItems: BreadcrumbItem[] = [{ label: "Início", href: "/" }, ...items];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.href ? `${SITE_URL}${item.href}` : undefined,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-400">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;

          return (
            <span key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}

              {isLast || !item.href ? (
                <span className="text-white" aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="transition hover:text-white">
                  {item.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}

export default memo(Breadcrumb);
