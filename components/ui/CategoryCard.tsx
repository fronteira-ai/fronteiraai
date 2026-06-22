import { memo } from "react";
import Link from "next/link";
import { animations } from "@/styles/animations";

type Props = {
  icon: string;
  name: string;
  href?: string;
  productCount?: number;
};

function CategoryCard({
  icon,
  name,
  href = "#",
  productCount,
}: Props) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center hover:bg-slate-800 ${animations.cardHover}`}
    >
      <div className="mb-6 text-5xl transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110">
        {icon}
      </div>

      <h3 className="text-2xl font-bold text-white">
        {name}
      </h3>

      {productCount !== undefined && (
        <p className="mt-3 text-slate-400">
          {productCount.toLocaleString("pt-BR")} produtos
        </p>
      )}
    </Link>
  );
}

export default memo(CategoryCard);