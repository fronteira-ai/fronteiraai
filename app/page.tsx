import { supabase } from "../lib/supabase";

export default async function Home() {
  const { data: stores } = await supabase
    .from("stores")
    .select("*")
    .order("rating", { ascending: false });

  return (
    <main className="min-h-screen bg-black text-white p-10">

      <h1 className="text-5xl font-bold mb-3">
        Paragu<span className="text-blue-500">AI</span>
      </h1>

      <p className="text-zinc-400 mb-10">
        As melhores lojas do Paraguai.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

        {stores?.map((store) => (

          <div
            key={store.id}
            className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 hover:border-blue-500 transition"
          >

            <h2 className="text-2xl font-bold">
              {store.name}
            </h2>

            <p className="text-zinc-400 mt-2">
              {store.description}
            </p>

            <div className="mt-5 space-y-2 text-sm">

              <p>📍 {store.city}</p>

              <p>⭐ {store.rating}</p>

              <p>🌎 {store.country}</p>

            </div>

          </div>

        ))}

      </div>

    </main>
  );
}