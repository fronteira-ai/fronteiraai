"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

type Props = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function Error({ error, unstable_retry }: Props) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    console.error(error);

    function updateStatus() {
      setOffline(!navigator.onLine);
    }

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, [error]);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <div className="mx-auto max-w-3xl px-6 pt-40 pb-24 text-center">
        {offline ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/60 text-slate-400">
              <WifiOff size={28} />
            </div>

            <h1 className="mt-6 text-3xl font-bold text-white">
              Você está sem conexão
            </h1>

            <p className="mt-4 text-slate-400">
              Verifique sua internet. O catálogo volta a funcionar
              automaticamente quando a conexão for restabelecida.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-white">
              Não foi possível carregar o catálogo
            </h1>

            <p className="mt-4 text-slate-400">
              Algo deu errado ao buscar os produtos. Tente novamente em
              alguns instantes.
            </p>
          </>
        )}

        <button
          onClick={() => unstable_retry()}
          disabled={offline}
          className="mt-8 rounded-full bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tentar novamente
        </button>
      </div>

      <Footer />
    </main>
  );
}
