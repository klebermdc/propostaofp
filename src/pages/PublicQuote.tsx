import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plane, MessageCircle, Mail, Calendar, MapPin } from "lucide-react";
import { itemTypeConfig } from "@/lib/quote-item-types";
import type { Database } from "@/integrations/supabase/types";

type Quote = Database["public"]["Tables"]["quotes"]["Row"];
type QuoteItem = Database["public"]["Tables"]["quote_items"]["Row"];

export default function PublicQuote() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (shareToken) fetchQuote();
  }, [shareToken]);

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

    setQuote(quoteData);
    setItems(itemsData || []);
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

  // Group items by type
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
            <span className="font-display text-lg font-bold">Lovable Travel</span>
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
        {/* Items grouped by type */}
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
                {typeItems.map((item) => (
                  <div key={item.id} className="p-4">
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
                      </div>
                    </div>
                  </div>
                ))}
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
                <span>Total</span>
                <span className="text-primary">R$ {total.toFixed(2)}</span>
              </div>
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
