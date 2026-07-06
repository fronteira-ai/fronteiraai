// Purely decorative — the CTO's reference mockup is a photographic
// globe+cityscape+bridge illustration (a graphic design asset). This is a
// richer CSS/SVG equivalent than the first pass: a glowing sphere, a faint
// skyline silhouette suggesting the border cities, and a lit
// Brasil<->Paraguai bridge connection — still not a pixel match for a
// rendered illustration, but closer than a plain gradient circle. A real
// illustration/Lottie can replace this file later without touching layout,
// since Hero.tsx only renders `<HeroGlobe />` with no props.
// aria-hidden: the surrounding copy already states the same idea in words.
export default function HeroGlobe() {
  return (
    <div aria-hidden="true" className="relative mx-auto hidden h-[420px] w-[440px] shrink-0 lg:block">
      {/* Sphere */}
      <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#38bdf8_0%,#2563eb_45%,#0f172a_78%)] opacity-90 shadow-[0_0_140px_50px_rgba(37,99,235,0.35)]" />

      <div
        className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(255,255,255,0.35) 25px), repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(255,255,255,0.25) 25px)",
          maskImage: "radial-gradient(circle, black 60%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(circle, black 60%, transparent 100%)",
        }}
      />

      <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 animate-[spin_50s_linear_infinite] rounded-full opacity-30">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-300/60 to-transparent" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
      </div>

      {/* Skyline silhouette suggesting the border cities, sitting "in front"
          of the sphere's lower edge */}
      <svg className="absolute bottom-2 left-1/2 h-24 w-[380px] -translate-x-1/2" viewBox="0 0 380 96" fill="none">
        <g fill="#020617" opacity="0.9">
          <rect x="0" y="40" width="18" height="56" />
          <rect x="22" y="24" width="14" height="72" />
          <rect x="40" y="50" width="20" height="46" />
          <rect x="64" y="10" width="16" height="86" />
          <rect x="84" y="34" width="18" height="62" />
          <rect x="106" y="55" width="14" height="41" />
          <rect x="150" y="18" width="20" height="78" />
          <rect x="174" y="42" width="16" height="54" />
          <rect x="260" y="30" width="18" height="66" />
          <rect x="282" y="52" width="14" height="44" />
          <rect x="300" y="14" width="20" height="82" />
          <rect x="324" y="40" width="16" height="56" />
          <rect x="344" y="58" width="18" height="38" />
          <rect x="364" y="30" width="16" height="66" />
        </g>
        <g fill="#facc15" opacity="0.5">
          <rect x="24" y="30" width="2" height="2" />
          <rect x="68" y="18" width="2" height="2" />
          <rect x="88" y="42" width="2" height="2" />
          <rect x="154" y="26" width="2" height="2" />
          <rect x="264" y="38" width="2" height="2" />
          <rect x="304" y="22" width="2" height="2" />
        </g>
      </svg>

      <div className="absolute -left-2 top-[30%] flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur">
        🇧🇷 BRASIL
      </div>
      <div className="absolute -right-4 bottom-[26%] flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur">
        🇵🇾 PARAGUAI
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 440 420" fill="none">
        <path
          d="M 70 160 Q 220 260 370 260"
          stroke="url(#arcGradient)"
          strokeWidth="2"
          strokeDasharray="6 8"
          className="animate-[dash_3s_linear_infinite]"
        />
        <defs>
          <linearGradient id="arcGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
