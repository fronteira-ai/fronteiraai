import { memo } from "react";
import Link from "next/link";

type Props = {
  categoryName?: string | null;
  productName: string;
};

function ProductBreadcrumb({ categoryName, productName }: Props) {
  return (
    <nav className="flex items-center gap-2 text-sm text-slate-400">

      <Link href="/" className="transition hover:text-white">
        Início
      </Link>

      {categoryName ? (
        <>
          <span>/</span>
          <span className="text-slate-300">{categoryName}</span>
        </>
      ) : null}

      <span>/</span>
      <span className="text-white">{productName}</span>

    </nav>
  );
}

export default memo(ProductBreadcrumb);
