"use client";

import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

type Props = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function Error({ error, unstable_retry }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <div className="mx-auto max-w-3xl px-6 pt-40 pb-24 text-center">
        <h1 className="text-3xl font-bold text-white">
          Não foi possível carregar esta loja
        </h1>

        <p className="mt-4 text-slate-400">
          Algo deu errado ao buscar as informações. Tente novamente em alguns
          instantes.
        </p>

        <button
          onClick={() => unstable_retry()}
          className="mt-8 rounded-full bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-500"
        >
          Tentar novamente
        </button>
      </div>

      <Footer />
    </main>
  );
}
