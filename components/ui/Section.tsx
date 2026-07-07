import Container from "@/components/ui/Container";

type Props = {
  children: React.ReactNode;
  className?: string;
  id?: string;
};

export default function Section({ children, className = "", id }: Props) {
  return (
    <section id={id} className={`py-16 sm:py-20 ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}
