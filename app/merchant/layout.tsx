import { ToastProvider } from "@/contexts/admin/ToastContext";
import { ToastContainer } from "@/components/admin/ui/ToastContainer";

export const metadata = {
  title: { default: "Lojista | ParaguAI", template: "%s — Lojista | ParaguAI" },
  robots: { index: false, follow: false },
};

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastContainer />
    </ToastProvider>
  );
}
