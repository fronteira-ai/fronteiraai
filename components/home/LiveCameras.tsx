import { Camera, Cctv } from "lucide-react";
import DashboardCardShell from "./dashboard/DashboardCardShell";

export interface LiveCameraFeed {
  id: string;
  label: string;
  streamUrl: string;
  thumbnailUrl: string | null;
}

// Planned slots, named after real border-region locations — not a real
// integration yet (no streamUrl exists for any of them). Naming them here
// documents intent without pretending a feed exists (each slot renders an
// honest "Em breve" badge, never a fabricated "Ao vivo" state).
const PLANNED_LOCATIONS = ["Ponte da Amizade", "Shopping China", "Pedro Juan Caballero", "Ciudad del Este"] as const;

type Props = {
  /** Deliberately not wired to any real source yet. A future Wave passes a
   * real feed list here — the component and its data contract already exist
   * so that Wave is an adapter, not a redesign. */
  feeds?: LiveCameraFeed[];
};

// Release 1.9 — Program F — Wave 2 (v0 realignment). The v0 export embeds
// this as the third column of the dashboard's stores/categories/cameras row
// and shows real-looking static thumbnails under a permanent "Ao vivo"
// badge — adopted here only for placement/chrome (DashboardCardShell, 2x2
// grid to fit the narrower column). The always-on "Live" badge is not
// adopted: there is still no real camera feed, so every slot keeps the
// honest "Em breve" state (would otherwise present fabricated data as real,
// AI_CONSTITUTION.md).
export default function LiveCameras({ feeds = [] }: Props) {
  const slots = feeds.length > 0 ? feeds : PLANNED_LOCATIONS.map((label) => ({ id: label, label, streamUrl: "", thumbnailUrl: null }));
  const isLive = feeds.length > 0;

  return (
    <DashboardCardShell icon={<Cctv size={16} />} title="Câmeras ao vivo">
      <div className="grid grid-cols-2 gap-2">
        {slots.map((slot) => (
          <div key={slot.id} className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-black/30">
            <Camera size={20} className="text-slate-600" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/85 to-transparent p-1.5">
              <p className="truncate text-[9.5px] font-semibold text-white">{slot.label}</p>
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[8.5px] font-bold uppercase ${
                  isLive ? "bg-negative/90 text-white" : "bg-white/15 text-slate-300"
                }`}
              >
                {isLive ? (
                  <>
                    <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
                    Ao vivo
                  </>
                ) : (
                  "Em breve"
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </DashboardCardShell>
  );
}
