export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="max-w-4xl text-center">
        <h1 className="text-6xl font-bold mb-6">
          Paragu<span className="text-blue-500">AI</span>
        </h1>

        <p className="text-xl text-zinc-400 mb-10">
          A inteligência das compras no Paraguai.
        </p>

        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <input
            type="text"
            placeholder="Busque por iPhone, Notebook, Perfume..."
            className="px-5 py-4 rounded-xl bg-zinc-900 border border-zinc-800 w-[350px]"
          />

          <button className="px-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 transition">
            Buscar Produtos
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
          <div className="p-4 rounded-xl bg-zinc-900">📱 iPhones</div>
          <div className="p-4 rounded-xl bg-zinc-900">💻 Notebooks</div>
          <div className="p-4 rounded-xl bg-zinc-900">🎮 Games</div>
          <div className="p-4 rounded-xl bg-zinc-900">🌟 Perfumes</div>
        </div>
      </div>
    </main>
  );
}