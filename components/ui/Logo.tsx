type LogoProps = {
  size?: "sm" | "md" | "lg";
};

export default function Logo({ size = "md" }: LogoProps) {
  const sizes = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-5xl",
  };

  return (
    <h1 className={`${sizes[size]} font-extrabold tracking-tight select-none`}>
      <span className="text-white">Paragu</span>
      <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
        AI
      </span>
    </h1>
  );
}