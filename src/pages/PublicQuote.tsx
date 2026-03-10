import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Plane, MessageCircle, Mail, Calendar, Sparkles, Star,
  CheckCircle2, Clock, Shield, ArrowRight,
} from "lucide-react";
import { itemTypeConfig } from "@/lib/quote-item-types";
import { HotelDetails, type HotelData } from "@/components/public-quote/HotelDetails";
import type { Database } from "@/integrations/supabase/types";

type Quote = Database["public"]["Tables"]["quotes"]["Row"];
type QuoteItem = Database["public"]["Tables"]["quote_items"]["Row"];

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
      <div className="flex min-h-screen items-center justify-center bg-[hsl(30,30%,4%)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-accent animate-pulse" />
          </div>
          <p className="text-white/60 text-sm font-medium">Preparando sua magia...</p>
        </div>
      </div>
    );
  }

  if (notFound || !quote) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(30,30%,4%)] px-4">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
            <Plane className="h-10 w-10 text-accent/60" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Proposta não encontrada</h1>
          <p className="mt-3 text-white/50 max-w-sm mx-auto">
            Esta proposta pode ter expirado ou não estar mais disponível. Entre em contato com seu agente.
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
        `Olá! Gostaria de fechar o orçamento "${quote.title}". Vamos conversar? ✨`
      )}`
    : null;

  const whatsappGenericUrl = `https://wa.me/?text=${encodeURIComponent(
    `Olá! Vi o orçamento "${quote.title}" e gostaria de mais informações.`
  )}`;

  return (
    <div className="min-h-screen bg-[hsl(30,30%,4%)] text-white">
      {/* Global styles */}
      <style>{`
        @keyframes sparkle-drift { 0%{transform:translateY(0) rotate(0deg);opacity:0} 20%{opacity:1} 100%{transform:translateY(-40px) rotate(180deg);opacity:0} }
        .magic-gradient { background: linear-gradient(135deg, hsl(25,90%,48%) 0%, hsl(35,95%,55%) 50%, hsl(30,85%,50%) 100%); }
        .glass-card { background: rgba(255,255,255,0.06); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); }
        .glow-accent { box-shadow: 0 0 30px hsl(32,95%,52%,0.3), 0 0 60px hsl(32,95%,52%,0.1); }
      `}</style>

      {/* Compact Hero */}
      <div className="magic-gradient px-4 pb-12 pt-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 30%, white 1px, transparent 1px), radial-gradient(circle at 50% 80%, white 1.5px, transparent 1.5px)', backgroundSize: '60px 60px, 80px 80px, 100px 100px'}} />
        <div className="mx-auto max-w-3xl relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Plane className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="font-display text-base font-bold tracking-tight text-white">Orlando Fast Pass</span>
            </div>
            {quote.valid_until && (
              <div className="flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs text-white/80">
                <Clock className="h-3 w-3" />
                Até {new Date(quote.valid_until).toLocaleDateString("pt-BR")}
              </div>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-snug">
            Proposta Mágica ✨
          </h1>
          {quote.client_name && (
            <p className="mt-1.5 text-sm text-white/80">
              Preparada para <span className="font-semibold text-white">{quote.client_name}</span>
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 -mt-4 pb-16 space-y-5 relative z-10">

        {/* Trust badges */}
        <div className="glass-card rounded-2xl p-4 flex flex-wrap justify-center gap-4 sm:gap-8 text-center">
          {[
            { icon: Shield, label: "Pagamento\nSeguro" },
            { icon: Star, label: "Melhor\nPreço" },
            { icon: CheckCircle2, label: "Experiência\nGarantida" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-white/70">
              <Icon className="h-5 w-5 text-accent" />
              <span className="text-xs font-medium whitespace-pre-line text-left">{label}</span>
            </div>
          ))}
        </div>

        {/* Grouped items */}
        {Object.entries(grouped).map(([type, typeItems]) => {
          const config = itemTypeConfig[type as keyof typeof itemTypeConfig];
          const Icon = config.icon;
          return (
            <Card key={type} className="overflow-hidden rounded-2xl border-white/10 bg-white/[0.03] backdrop-blur-sm shadow-xl">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl magic-gradient shadow-md">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-display text-lg font-semibold text-white">{config.label}</h2>
                <Badge variant="outline" className="ml-auto border-white/20 text-white/50 text-xs">
                  {typeItems.length} {typeItems.length === 1 ? "item" : "itens"}
                </Badge>
              </div>
              <CardContent className="divide-y divide-white/5 p-0">
                {typeItems.map((item) => {
                  const hotelId = (item.metadata as any)?.hotel_id;
                  const hotelData = hotelId ? hotelDataMap[hotelId] : null;

                  return (
                    <div key={item.id} className="p-5 space-y-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white">{item.description}</p>
                          {(item.start_date || item.end_date) && (
                            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/50">
                              <Calendar className="h-3.5 w-3.5" />
                              {item.start_date && new Date(item.start_date).toLocaleDateString("pt-BR")}
                              {item.start_date && item.end_date && " → "}
                              {item.end_date && new Date(item.end_date).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                          {item.observations && (
                            <p className="mt-1.5 text-sm text-white/40">{item.observations}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-accent">
                            R$ {(item.unit_price * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-xs text-white/40 mt-0.5">
                              {item.quantity}x R$ {item.unit_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          )}
                          {quote.installment_count > 1 && item.unit_price > 0 && (
                            <p className="text-xs text-accent/70 mt-0.5">
                              ou {quote.installment_count}x R$ {((item.unit_price * item.quantity) / quote.installment_count).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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

        {/* Total Card */}
        <Card className="overflow-hidden rounded-2xl glow-accent border-accent/30 bg-white/[0.05] backdrop-blur-sm">
          <CardContent className="p-6 space-y-3">
            <div className="flex justify-between text-sm text-white/60">
              <span>Subtotal</span>
              <span>R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-success flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Desconto especial
                </span>
                <span className="text-success font-medium">
                  - R$ {quote.discount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <Separator className="bg-white/10" />
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-white/50">Total à vista</p>
                <p className="text-3xl font-display font-bold text-accent mt-1">
                  R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              {quote.installment_count > 1 && total > 0 && (
                <div className="text-right">
                  <p className="text-white/50 text-xs">ou parcelado</p>
                  <p className="text-white font-semibold">
                    {quote.installment_count}x R$ {(total / quote.installment_count).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 text-center space-y-5">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full magic-gradient shadow-lg mx-auto">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Pronto para realizar seu sonho? ✨
          </h2>
          <p className="text-white/60 max-w-md mx-auto">
            Garanta já sua viagem mágica para Orlando! Fale com nosso time e feche seu pacote com as melhores condições.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-2">
            {whatsappUrl && (
              <Button asChild size="lg" className="gap-2 magic-gradient text-white hover:opacity-90 shadow-lg rounded-xl text-base px-8 h-12 font-semibold">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-5 w-5" /> Fechar agora no WhatsApp
                  <ArrowRight className="h-4 w-4 ml-1" />
                </a>
              </Button>
            )}
            {quote.client_email && (
              <Button asChild size="lg" className="gap-2 glass-card text-white hover:bg-white/10 rounded-xl text-base px-8 h-12 border-white/20">
                <a href={`mailto:${quote.client_email}?subject=Proposta Mágica - ${quote.title}&body=Olá, gostaria de fechar a proposta "${quote.title}".`}>
                  <Mail className="h-5 w-5" /> Enviar email
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <Card className="rounded-2xl border-white/10 bg-white/[0.03] backdrop-blur-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">Condições e observações</p>
              <p className="text-sm text-white/60 whitespace-pre-wrap leading-relaxed">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Segundo CTA menor */}
        <div className="text-center space-y-3 py-4">
          <p className="text-white/40 text-sm">Tem alguma dúvida? Estamos aqui para ajudar!</p>
          <Button asChild variant="outline" className="rounded-full border-accent/40 text-accent hover:bg-accent/10 px-6">
            <a href={whatsappUrl || whatsappGenericUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-2" /> Tirar dúvidas
            </a>
          </Button>
        </div>

        {/* Footer */}
        <div className="pt-6 pb-4 text-center border-t border-white/5">
          <div className="flex items-center justify-center gap-2 text-white/30 text-sm">
            <Plane className="h-4 w-4" />
            <span className="font-display font-semibold">Orlando Fast Pass</span>
          </div>
          <p className="text-white/20 text-xs mt-2">Transformando sonhos em realidade ✨</p>
        </div>
      </div>
    </div>
  );
}
