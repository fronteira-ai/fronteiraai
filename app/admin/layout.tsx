import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { ToastProvider } from "@/contexts/admin/ToastContext";
import { ToastContainer } from "@/components/admin/ui/ToastContainer";

export const metadata = {
  title: { default: "Admin | ParaguAI", template: "%s — Admin | ParaguAI" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-950 text-white">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <ToastContainer />
    </ToastProvider>
  );
}
