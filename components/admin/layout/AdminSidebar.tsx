"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Upload,
  ShieldCheck,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type NavLeaf = { type: "leaf"; label: string; href: string; icon: LucideIcon; exact?: boolean };
type NavGroup = { type: "group"; label: string; icon: LucideIcon; children: { label: string; href: string }[] };
type NavItem = NavLeaf | NavGroup;

const nav: NavItem[] = [
  { type: "leaf", label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  {
    type: "group",
    label: "Catálogo",
    icon: Package,
    children: [
      { label: "Produtos", href: "/admin/catalog/products" },
      { label: "Categorias", href: "/admin/catalog/categories" },
      { label: "Marcas", href: "/admin/catalog/brands" },
      { label: "Lojas", href: "/admin/catalog/stores" },
      { label: "Ofertas", href: "/admin/catalog/offers" },
    ],
  },
  { type: "leaf", label: "Importações", href: "/admin/imports", icon: Upload },
  { type: "leaf", label: "Qualidade", href: "/admin/quality", icon: ShieldCheck },
  { type: "leaf", label: "Logs", href: "/admin/logs", icon: FileText },
  { type: "leaf", label: "Configurações", href: "/admin/settings", icon: Settings },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname.startsWith(href);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
            P
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">ParaguAI</p>
            <p className="text-slate-500 text-xs mt-0.5">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {nav.map((item) => {
          if (item.type === "group") {
            const isGroupActive = item.children.some((c) => isActive(pathname, c.href));
            return (
              <div key={item.label}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider mb-1 mt-2 ${
                    isGroupActive ? "text-indigo-400" : "text-slate-500"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </div>
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`flex items-center gap-2.5 pl-7 pr-3 py-1.5 rounded-lg text-sm transition-colors ${
                      isActive(pathname, child.href)
                        ? "bg-indigo-600/10 text-indigo-400"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    {child.label}
                  </Link>
                ))}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive(pathname, item.href, item.exact)
                  ? "bg-indigo-600/10 text-indigo-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );
}
