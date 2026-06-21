import { memo } from "react";
import { ProductWithRelations } from "@/types/product";

type Props = {
  product: ProductWithRelations;
};

function ProductHeader({ product }: Props) {
  return (
    <div>

      <div className="flex flex-wrap items-center gap-3 text-sm">

        {product.brand ? (
          <span className="rounded-full bg-blue-500/20 px-4 py-1.5 font-medium text-blue-300">
            {product.brand.name}
          </span>
        ) : null}

        {product.category ? (
          <span className="rounded-full border border-slate-700 px-4 py-1.5 text-slate-300">
            {product.category.name}
          </span>
        ) : null}

      </div>

      <h1 className="mt-4 text-4xl font-black text-white">
        {product.name}
      </h1>

      <p className="mt-4 max-w-2xl leading-7 text-slate-400">
        {product.description}
      </p>

    </div>
  );
}

export default memo(ProductHeader);
