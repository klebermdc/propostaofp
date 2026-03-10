import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type HotelFoto = Database["public"]["Tables"]["hotel_fotos"]["Row"];

export function HotelPhotoCarousel({ fotos }: { fotos: HotelFoto[] }) {
  const [current, setCurrent] = useState(0);
  if (fotos.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl aspect-video bg-muted group">
      <img
        src={fotos[current].url}
        alt={fotos[current].legenda || "Foto do hotel"}
        className="h-full w-full object-cover transition-all duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      {fotos.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + fotos.length) % fotos.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % fotos.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="h-4 w-4 text-foreground" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {fotos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`block h-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-2 bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
