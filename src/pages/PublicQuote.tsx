import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plane, MessageCircle, Mail, Calendar, MapPin, Star, Coffee, Car, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { itemTypeConfig } from "@/lib/quote-item-types";
import type { Database } from "@/integrations/supabase/types";

type Quote = Database["public"]["Tables"]["quotes"]["Row"];
type QuoteItem = Database["public"]["Tables"]["quote_items"]["Row"];
type Hotel = Database["public"]["Tables"]["hoteis_orlando"]["Row"];
type HotelFoto = Database["public"]["Tables"]["hotel_fotos"]["Row"];

interface HotelData {
  hotel: Hotel;
  fotos: HotelFoto[];
}

function HotelPhotoCarousel({ fotos }: { fotos: HotelFoto[] }) {
  const [current, setCurrent] = useState(0);
  if (fotos.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-lg aspect-video bg-muted">
      <img
        src={fotos[current].url}
        alt={fotos[current].legenda || "Foto do hotel"}
        className="h-full w-full object-cover transition-opacity duration-300"
      />
      {fotos.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + fotos.length) % fotos.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow hover:bg-background"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % fotos.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow hover:bg-background"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {fotos.map((_, i) => (
              <span
                key={i}
                className={`block h-1.5 w-1.5 rounded-full transition-colors ${i === current ? "bg-primary-foreground" : "bg-primary-foreground/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HotelDetails({ hotel, fotos }: HotelData) {
  return (
    <div className="space-y-3">
      <HotelPhotoCarousel fotos={fotos} />
      <div className="flex flex-wrap gap-2">
        {hotel.categoria && (
          <Badge variant="secondary" className="gap-1">
            <Star className="h-3 w-3" /> {hotel.categoria}
          </Badge>
        )}
        {hotel.regiao && (
          <Badge variant="outline" className="gap-1">
            <MapPin className="h-3 w-3" /> {hotel.regiao}
          </Badge>
        )}
        {hotel.cafe_da_manha_incluso && (
          <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
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

export default function PublicQuote() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [hotelDataMap, setHotelDataMap] = useState<Record<number, HotelData>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (shareToken) fetchQuote();
  }, [shareToken]);

  useEffect(() => {
    if (quote) {
      const clientPart = quote.client_name ? ` para ${quote.client_name}` : "";
      document.title = `${quote.title}${clientPart} — Orlando Fast Pass`;
    }
    return () => { document.title = "Orlando Fast Pass — Sua viagem dos sonhos"; };
  }, [quote]);

  const fetchQuote = async () => {
    const { data: quoteData, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("share_token", shareToken!)
      .single();

    if (error || !quoteData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const { data: itemsData } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteData.id)
      .order("sort_order");

    const allItems = itemsData || [];

    // Collect hotel IDs from metadata
    const hotelIds = allItems
      .filter((i) => i.item_type === "hotel" && (i.metadata as any)?.hotel_id)
      .map((i) => (i.metadata as any).hotel_id as number);

    const uniqueHotelIds = [...new Set(hotelIds)];

    if (uniqueHotelIds.length > 0) {
      const [{ data: hotels }, { data: fotos }] = await Promise.all([
        supabase.from("hoteis_orlando").select("*").in("id", uniqueHotelIds),
        supabase.from("hotel_fotos").select("*").in("hotel_id", uniqueHotelIds).order("sort_order"),
      ]);

      const map: Record<number, HotelData> = {};
      (hotels || []).forEach((h) => {
        map[h.id] = { hotel: h, fotos: (fotos || []).filter((f) => f.hotel_id === h.id) };
      });
      setHotelDataMap(map);
    }

    setQuote(quoteData);
    setItems(allItems);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !quote) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <Plane className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <h1 className="font-display text-2xl font-bold">Orçamento não encontrado</h1>
          <p className="mt-2 text-muted-foreground">
            Este orçamento pode ter expirado ou não estar disponível.
          </p>
        </div>
      </div>
    );
  }

  const subtotal = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const total = subtotal - quote.discount;

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.item_type]) acc[item.item_type] = [];
    acc[item.item_type].push(item);
    return acc;
  }, {} as Record<string, QuoteItem[]>);

  const whatsappUrl = quote.client_phone
    ? `https://wa.me/${quote.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá! Gostaria de conversar sobre o orçamento "${quote.title}".`
      )}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary px-4 pb-16 pt-12 text-primary-foreground">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/20">
              <Plane className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold">Orlando Fast Pass</span>
          </div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{quote.title}</h1>
          {quote.client_name && (
            <p className="mt-2 text-lg text-primary-foreground/80">
              Preparado para {quote.client_name}
            </p>
          )}
          {quote.valid_until && (
            <div className="mt-4 flex items-center gap-2 text-sm text-primary-foreground/70">
              <Calendar className="h-4 w-4" />
              Válido até {new Date(quote.valid_until).toLocaleDateString("pt-BR")}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 -mt-8 pb-12 space-y-6">
        {Object.entries(grouped).map(([type, typeItems]) => {
          const config = itemTypeConfig[type as keyof typeof itemTypeConfig];
          const Icon = config.icon;
          return (
            <Card key={type} className="overflow-hidden animate-fade-in shadow-lg">
              <CardHeader className="bg-muted/50 pb-3 pt-4">
                <CardTitle className="flex items-center gap-2 font-display text-base">
                  <Icon className="h-5 w-5 text-primary" />
                  {config.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {typeItems.map((item) => {
                  const hotelId = (item.metadata as any)?.hotel_id;
                  const hotelData = hotelId ? hotelDataMap[hotelId] : null;

                  return (
                    <div key={item.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.description}</p>
                          {(item.start_date || item.end_date) && (
                            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {item.start_date &&
                                new Date(item.start_date).toLocaleDateString("pt-BR")}
                              {item.start_date && item.end_date && " → "}
                              {item.end_date &&
                                new Date(item.end_date).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                          {item.observations && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.observations}
                            </p>
                          )}
                        </div>
                        <div className="ml-4 text-right">
                          <p className="font-semibold">
                            R$ {(item.unit_price * item.quantity).toFixed(2)}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-xs text-muted-foreground">
                              {item.quantity}x R$ {item.unit_price.toFixed(2)}
                            </p>
                          )}
                          {(quote as any).installment_count > 1 && item.unit_price > 0 && (
                            <p className="text-xs text-muted-foreground">
                              ou {(quote as any).installment_count}x R$ {((item.unit_price * item.quantity) / (quote as any).installment_count).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      {hotelData && <HotelDetails {...hotelData} />}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        {/* Summary */}
        <Card className="shadow-lg border-primary/20">
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="text-destructive">- R$ {quote.discount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Total à vista</span>
                <span className="text-primary">R$ {total.toFixed(2)}</span>
              </div>
              {(quote as any).installment_count > 1 && total > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>ou parcelado em {(quote as any).installment_count}x</span>
                  <span>R$ {(total / (quote as any).installment_count).toFixed(2)}/mês</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-muted-foreground mb-2">Condições e observações</p>
              <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Contact buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          {whatsappUrl && (
            <Button asChild size="lg" className="gap-2 bg-[hsl(142,72%,40%)] hover:bg-[hsl(142,72%,35%)]">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" /> Falar no WhatsApp
              </a>
            </Button>
          )}
          {quote.client_email && (
            <Button asChild variant="outline" size="lg" className="gap-2">
              <a href={`mailto:${quote.client_email}`}>
                <Mail className="h-5 w-5" /> Enviar email
              </a>
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="pt-8 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Plane className="h-4 w-4" />
            Lovable Travel
          </div>
        </div>
      </div>
    </div>
  );
}
