import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Coffee, Car, Globe } from "lucide-react";
import { HotelPhotoCarousel } from "./HotelPhotoCarousel";
import type { Database } from "@/integrations/supabase/types";

type Hotel = Database["public"]["Tables"]["hoteis_orlando"]["Row"];
type HotelFoto = Database["public"]["Tables"]["hotel_fotos"]["Row"];

export interface HotelData {
  hotel: Hotel;
  fotos: HotelFoto[];
}

export function HotelDetails({ hotel, fotos }: HotelData) {
  return (
    <div className="space-y-3 mt-2">
      <HotelPhotoCarousel fotos={fotos} />
      <div className="flex flex-wrap gap-2">
        {hotel.categoria && (
          <Badge className="gap-1 bg-accent/10 text-accent border-accent/30 hover:bg-accent/20">
            <Star className="h-3 w-3" /> {hotel.categoria}
          </Badge>
        )}
        {hotel.regiao && (
          <Badge variant="outline" className="gap-1">
            <MapPin className="h-3 w-3" /> {hotel.regiao}
          </Badge>
        )}
        {hotel.cafe_da_manha_incluso && (
          <Badge className="gap-1 bg-success/10 text-success border-success/30">
            <Coffee className="h-3 w-3" /> Café da manhã incluso
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        {hotel.marca && (
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" /> {hotel.marca}
          </div>
        )}
        {hotel.distancia_disney_km != null && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Disney: {hotel.distancia_disney_km}km
          </div>
        )}
        {hotel.distancia_universal_km != null && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Universal: {hotel.distancia_universal_km}km
          </div>
        )}
        {hotel.distancia_outlet_km != null && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Outlet: {hotel.distancia_outlet_km}km
          </div>
        )}
        {hotel.estacionamento_tipo && (
          <div className="flex items-center gap-1.5">
            <Car className="h-3.5 w-3.5" /> Estacionamento: {hotel.estacionamento_tipo}
            {hotel.estacionamento_valor_diaria ? ` (R$ ${hotel.estacionamento_valor_diaria}/dia)` : ""}
          </div>
        )}
        {hotel.tipo_quarto_familia && (
          <div className="col-span-2 flex items-center gap-1.5">
            🛏️ {hotel.tipo_quarto_familia}
          </div>
        )}
      </div>
      {hotel.observacoes && (
        <p className="text-sm text-muted-foreground italic">{hotel.observacoes}</p>
      )}
    </div>
  );
}
