"use client";
import { useToast, type ToastType } from "@/contexts/admin/ToastContext";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
};

const borders: Record<ToastType, string> = {
  success: "border-l-green-500",
  error: "border-l-red-500",
  warning: "border-l-yellow-500",
  info: "border-l-blue-500",
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 bg-slate-900 border border-slate-700 border-l-4 ${borders[t.type]} rounded-lg px-4 py-3 shadow-xl min-w-72 max-w-sm animate-in slide-in-from-right-4`}
        >
          <div className="shrink-0 mt-0.5">{icons[t.type]}</div>
          <p className="text-sm text-slate-200 flex-1">{t.message}</p>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
