type Option = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
};

export default function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  className = "",
}: Props) {
  // Sprint 2 — Auditoria de acessibilidade. O rótulo era um <span>, então o
  // <select> ficava sem nome acessível: um leitor de tela anunciava apenas
  // "caixa de combinação". Envolver o controle em <label> cria a associação
  // implícita, sem precisar de id nem de hook (o componente é usado tanto em
  // contexto de servidor quanto de cliente). Mesmas classes, mesmo layout —
  // <label> e <div> são block-level aqui; nenhum pixel muda.
  return (
    <label className="flex flex-col gap-1.5">
      {label ? (
        <span className="text-xs font-medium text-slate-400">{label}</span>
      ) : null}

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-white transition focus:border-blue-500 focus:outline-none ${className}`}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}

        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
