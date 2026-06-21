import Badge from "@/components/ui/Badge";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
};

export default function SectionTitle({
  eyebrow,
  title,
  description,
  align = "center",
}: Props) {
  const alignment = align === "center" ? "mx-auto text-center" : "text-left";

  return (
    <div className={`mb-14 max-w-2xl ${alignment}`}>
      {eyebrow ? <Badge>{eyebrow}</Badge> : null}

      <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
        {title}
      </h2>

      {description ? (
        <p className="mt-4 text-lg text-slate-400">{description}</p>
      ) : null}
    </div>
  );
}
