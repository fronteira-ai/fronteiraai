"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import Chip from "@/components/ui/Chip";

const suggestions = [
  "iPhone 17 Pro",
  "Notebook Gamer",
  "Apple Watch Ultra",
  "DJI Mini 4 Pro",
];

export default function SearchBar() {
  const [search, setSearch] = useState("");
  const router = useRouter();

  function handleSearch() {
    if (!search.trim()) return;
    router.push(`/search?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <div className="mt-12 w-full max-w-5xl">
      <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/70 shadow-2xl shadow-blue-500/10 backdrop-blur-xl transition-all duration-300 sm:flex-row sm:rounded-full focus-within:border-blue-500/60 focus-within:shadow-blue-500/30">
        <div className="flex items-center pl-6 pt-6 sm:pt-0">
          <Search size={22} className="text-slate-500" />
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="O que você deseja comprar hoje?"
          className="flex-1 bg-transparent px-5 py-6 text-lg text-white outline-none placeholder:text-slate-500"
        />

        <button
          onClick={handleSearch}
          className="m-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-8 py-4 font-semibold text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
        >
          <Sparkles size={18} />
          Perguntar à IA
        </button>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {suggestions.map((item) => (
          <Chip key={item} onClick={() => setSearch(item)}>
            {item}
          </Chip>
        ))}
      </div>
    </div>
  );
}
