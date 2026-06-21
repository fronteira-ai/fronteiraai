import Section from "@/components/ui/Section";
import SectionTitle from "@/components/ui/SectionTitle";
import CategoryCard from "@/components/ui/CategoryCard";
import Reveal from "@/components/ui/Reveal";
import { Category } from "@/types/category";

type CategoryDisplay = Category & { productCount?: number };

type Props = {
  categories: CategoryDisplay[];
};

export default function Categories({ categories }: Props) {
  return (
    <Section id="categorias">
      <SectionTitle
        eyebrow="Categorias"
        title="Explore por categoria"
        description="Encontre rapidamente os produtos mais procurados no Paraguai."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, index) => (
          <Reveal key={category.id} direction="up" delay={index * 70}>
            <CategoryCard
              icon={category.icon ?? "🛍️"}
              name={category.name}
              href={`/categories/${category.slug}`}
              productCount={category.productCount}
            />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
