import { Hotel, Plane, Car, Map, Shield, Package, Ticket } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type QuoteItemType = Database["public"]["Enums"]["quote_item_type"];

export const itemTypeConfig: Record<QuoteItemType, { label: string; icon: typeof Hotel }> = {
  hotel: { label: "Hotel", icon: Hotel },
  flight: { label: "Voo", icon: Plane },
  transfer: { label: "Transfer", icon: Car },
  tour: { label: "Passeio", icon: Map },
  insurance: { label: "Seguro Viagem", icon: Shield },
  ticket: { label: "Ingresso", icon: Ticket },
  other: { label: "Outro", icon: Package },
};

export const itemTypes = Object.entries(itemTypeConfig).map(([value, config]) => ({
  value: value as QuoteItemType,
  ...config,
}));
