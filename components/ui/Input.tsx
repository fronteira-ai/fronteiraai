import { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function Input({ label, id, className = "", ...props }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-xs font-medium text-slate-400">
          {label}
        </label>
      ) : null}

      <input
        id={id}
        className={`rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 transition focus:border-blue-500 focus:outline-none ${className}`}
        {...props}
      />
    </div>
  );
}
