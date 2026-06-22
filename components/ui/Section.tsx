import Container from "@/components/ui/Container";

type Props = {
  children: React.ReactNode;
  className?: string;
  id?: string;
};

export default function Section({ children, className = "", id }: Props) {
  return (
    <section id={id} className={`py-[76px] sm:py-[100px] ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}
