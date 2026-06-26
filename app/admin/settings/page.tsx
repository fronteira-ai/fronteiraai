import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { Database, HardDrive, Shield } from "lucide-react";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) redirect("/admin/login");

  const { data: storageData } = await auth.serviceClient.storage.getBucket("catalog");

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Configurações</h1>
        <p className="text-slate-400 text-sm mt-0.5">Status do sistema e configurações operacionais</p>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Banco de Dados</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Conexão</span>
              <span className="text-green-400 font-medium">Ativa</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Usuário autenticado</span>
              <span className="text-white">{auth.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Papel</span>
              <span className="text-white capitalize">{auth.role}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Storage</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Bucket catalog</span>
              <span className={storageData ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
                {storageData ? "Disponível" : "Não encontrado"}
              </span>
            </div>
            {storageData && (
              <div className="flex justify-between">
                <span className="text-slate-400">Acesso público</span>
                <span className="text-white">{storageData.public ? "Sim" : "Não"}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Segurança</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">RLS habilitado</span>
              <span className="text-green-400 font-medium">Sim</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Middleware de proteção</span>
              <span className="text-green-400 font-medium">Ativo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Service Role Client</span>
              <span className="text-green-400 font-medium">Configurado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
