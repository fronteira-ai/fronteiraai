import { Camera } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionTitle from "@/components/ui/SectionTitle";
import Reveal from "@/components/ui/Reveal";

export interface LiveCameraFeed {
  id: string;
  label: string;
  streamUrl: string;
  thumbnailUrl: string | null;
}

// Planned slots, named after real border-region locations — not a real
// integration yet (no streamUrl exists for any of them). Naming them here
// documents intent without pretending a feed exists (see LiveCameras below:
// each slot renders an honest "Em breve" badge, never a fabricated
// "Ao vivo" state).
const PLANNED_LOCATIONS = ["Ponte da Amizade", "Shopping China", "Pedro Juan Caballero", "Ciudad del Este"] as const;

type Props = {
  /** Deliberately not wired to any real source yet (Wave brief: "preparar
   * arquitetura, sem integração"). A future Wave passes a real feed list
   * here — the component and its data contract already exist so that Wave
   * is an adapter, not a redesign. */
  feeds?: LiveCameraFeed[];
};

// Release 1.9 — Program F — Wave 1. Architecture only, no live integration —
// per the Wave brief ("Preparar componente. Ainda sem integração."). The
// CTO's denser reference mockup shows these 4 slots with live-looking
// thumbnails and "Ao vivo" badges — reproduced here as the same dense grid,
// but honestly: no real camera feed exists, so every slot shows "Em breve",
// never a fabricated live thumbnail (would violate "nunca utilizar dados
// fictícios quando existirem dados reais" — here there is no real data at all).
export default function LiveCameras({ feeds = [] }: Props) {
  const slots = feeds.length > 0 ? feeds : PLANNED_LOCATIONS.map((label) => ({ id: label, label, streamUrl: "", thumbnailUrl: null }));

  return (
    <Section id="cameras-ao-vivo">
      <SectionTitle
        eyebrow="Em breve"
        title="Câmeras ao vivo da fronteira"
        description="Acompanhe o movimento da Ponte da Amizade em tempo real."
      />

      <Reveal direction="up">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {slots.map((slot) => {
            const isLive = feeds.length > 0;
            return (
              <div key={slot.id} className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                <div className="flex aspect-video items-center justify-center bg-slate-900">
                  <Camera size={24} className="text-slate-700" />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="text-xs font-semibold text-white">{slot.label}</p>
                  <span
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isLive ? "bg-red-500/90 text-white" : "bg-slate-700/90 text-slate-300"
                    }`}
                  >
                    {isLive ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        Ao vivo
                      </>
                    ) : (
                      "Em breve"
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </Section>
  );
}
