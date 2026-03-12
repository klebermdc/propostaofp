import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  Link as LinkIcon,
  Copy,
  Sparkles,
  Hotel,
  Ticket,
  ChevronsUpDown,
  Check,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { itemTypeConfig, itemTypes } from "@/lib/quote-item-types";
import { AIExtractModal } from "@/components/AIExtractModal";
import { MarketAnalysisModal } from "@/components/MarketAnalysisModal";
import { AppLogo } from "@/components/AppLogo";
import type { Database } from "@/integrations/supabase/types";

type Quote = Database["public"]["Tables"]["quotes"]["Row"];
type QuoteItem = Database["public"]["Tables"]["quote_items"]["Row"];
type QuoteItemInsert = Database["public"]["Tables"]["quote_items"]["Insert"];
type QuoteItemType = Database["public"]["Enums"]["quote_item_type"];

type HotelOption = {
  id: number;
  nome_hotel: string;
  marca: string | null;
  regiao: string;
  categoria: string;
  cafe_da_manha_incluso: boolean | null;
  estacionamento_tipo: string | null;
  tipo_quarto_familia: string | null;
  publico_brasileiro: string;
  cover_url?: string;
};

type TicketOption = {
  id: number;
  nome_ingresso: string;
  grupo: string;
  categoria: string | null;
  dias_validade: number | null;
  inclui_refeicao: boolean | null;
  preco_adulto: number | null;
  preco_crianca: number | null;
  observacoes: string | null;
};

export default function QuoteEditor() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showMarketAnalysis, setShowMarketAnalysis] = useState(false);
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [hotelCovers, setHotelCovers] = useState<Record<number, string>>({});
  const [tickets, setTickets] = useState<TicketOption[]>([]);

  // Form fields
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [discount, setDiscount] = useState(0);
  const [installmentCount, setInstallmentCount] = useState(10);

  useEffect(() => {
    if (id) fetchQuote();
    fetchHotels();
    fetchTickets();
  }, [id]);

  const fetchHotels = async () => {
    const [hotelsRes, coversRes] = await Promise.all([
      supabase.from("hoteis_orlando").select("id, nome_hotel, marca, regiao, categoria, cafe_da_manha_incluso, estacionamento_tipo, tipo_quarto_familia, publico_brasileiro").order("nome_hotel"),
      supabase.from("hotel_fotos").select("hotel_id, url").eq("is_capa", true),
    ]);
    if (hotelsRes.data) {
      setHotels(hotelsRes.data as unknown as HotelOption[]);
    }
    if (coversRes.data) {
      const covers: Record<number, string> = {};
      for (const f of coversRes.data as any[]) covers[f.hotel_id] = f.url;
      setHotelCovers(covers);
    }
  };

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("ingressos_orlando")
      .select("id, nome_ingresso, grupo, categoria, dias_validade, inclui_refeicao, preco_adulto, preco_crianca, observacoes")
      .order("grupo")
      .order("nome_ingresso");
    if (data) setTickets(data as unknown as TicketOption[]);
  };

  const selectTicketForItem = (itemId: string, ticketId: number) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    const details = [
      ticket.grupo && `Grupo: ${ticket.grupo}`,
      ticket.categoria && `Categoria: ${ticket.categoria}`,
      ticket.dias_validade && `Validade: ${ticket.dias_validade} dia(s)`,
      ticket.inclui_refeicao ? "Refeição inclusa" : null,
      ticket.preco_adulto && `Adulto: R$ ${ticket.preco_adulto}`,
      ticket.preco_crianca && `Criança: R$ ${ticket.preco_crianca}`,
    ].filter(Boolean).join(" | ");

    updateItem(itemId, {
      description: ticket.nome_ingresso,
      item_type: "ticket" as QuoteItemType,
      observations: details,
      metadata: { ticket_id: ticket.id, ticket_nome: ticket.nome_ingresso } as any,
      ...(ticket.preco_adulto ? { unit_price: Number(ticket.preco_adulto) } : {}),
    });
  };

  const selectHotelForItem = (itemId: string, hotelId: number) => {
    const hotel = hotels.find((h) => h.id === hotelId);
    if (!hotel) return;
    const details = [
      hotel.regiao && `Região: ${hotel.regiao}`,
      hotel.categoria && `Categoria: ${hotel.categoria}`,
      hotel.cafe_da_manha_incluso ? "Café da manhã incluso" : null,
      hotel.estacionamento_tipo && `Estacionamento: ${hotel.estacionamento_tipo}`,
      hotel.tipo_quarto_familia && `Quarto: ${hotel.tipo_quarto_familia}`,
    ].filter(Boolean).join(" | ");

    updateItem(itemId, {
      description: `${hotel.nome_hotel}${hotel.marca ? ` (${hotel.marca})` : ""}`,
      item_type: "hotel" as QuoteItemType,
      observations: details,
      metadata: { hotel_id: hotel.id, hotel_nome: hotel.nome_hotel } as any,
    });
  };

  const fetchQuote = async () => {
    const [quoteRes, itemsRes] = await Promise.all([
      supabase.from("quotes").select("*").eq("id", id!).single(),
      supabase.from("quote_items").select("*").eq("quote_id", id!).order("sort_order"),
    ]);

    if (quoteRes.error) {
      toast({ title: "Erro", description: quoteRes.error.message, variant: "destructive" });
      navigate("/dashboard");
      return;
    }

    const q = quoteRes.data;
    setQuote(q);
    setTitle(q.title);
    setClientName(q.client_name || "");
    setClientEmail(q.client_email || "");
    setClientPhone(q.client_phone || "");
    setNotes(q.notes || "");
    setValidUntil(q.valid_until || "");
    setDiscount(q.discount);
    setInstallmentCount((q as any).installment_count ?? 10);
    setItems(itemsRes.data || []);
    setLoading(false);
  };

  const saveQuote = async (newStatus?: Database["public"]["Enums"]["quote_status"]) => {
    if (!id) return;
    setSaving(true);

    const { error } = await supabase
      .from("quotes")
      .update({
        title,
        client_name: clientName || null,
        client_email: clientEmail || null,
        client_phone: clientPhone || null,
        notes: notes || null,
        valid_until: validUntil || null,
        discount,
        installment_count: installmentCount,
        ...(newStatus ? { status: newStatus } : {}),
      } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: newStatus === "sent" ? "Orçamento enviado!" : "Salvo!" });
      if (newStatus) {
        setQuote((prev) => prev ? { ...prev, status: newStatus } : prev);
      }
    }
    setSaving(false);
  };

  const addItem = async () => {
    if (!id) return;
    const newItem: QuoteItemInsert = {
      quote_id: id,
      description: "Novo item",
      item_type: "other",
      sort_order: items.length,
    };

    const { data, error } = await supabase.from("quote_items").insert(newItem).select().single();
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else if (data) {
      setItems((prev) => [...prev, data]);
    }
  };

  const updateItem = async (itemId: string, updates: Partial<QuoteItem>) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i)));

    const { error } = await supabase.from("quote_items").update(updates).eq("id", itemId);
    if (error) {
      toast({ title: "Erro ao atualizar item", description: error.message, variant: "destructive" });
    }
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase.from("quote_items").delete().eq("id", itemId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    }
  };

  const handleAIItems = useCallback(
    async (extractedItems: Omit<QuoteItemInsert, "quote_id">[], totalAVista?: number) => {
      if (!id) return;
      const toInsert = extractedItems.map((item, i) => ({
        ...item,
        quote_id: id,
        sort_order: items.length + i,
      }));

      const { data, error } = await supabase.from("quote_items").insert(toInsert).select();
      if (error) {
        toast({ title: "Erro ao adicionar itens da IA", description: error.message, variant: "destructive" });
      } else if (data) {
        const newItems = [...items, ...data];
        setItems(newItems);

        // If AI extracted a total à vista, calculate and apply discount
        if (totalAVista && totalAVista > 0) {
          const newSubtotal = newItems.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
          if (newSubtotal > totalAVista) {
            const newDiscount = Math.round((newSubtotal - totalAVista) * 100) / 100;
            setDiscount(newDiscount);
            toast({ title: `${data.length} item(ns) adicionado(s)`, description: `Desconto de R$ ${newDiscount.toFixed(2)} aplicado automaticamente (total à vista: R$ ${totalAVista.toFixed(2)})` });
          } else {
            toast({ title: `${data.length} item(ns) adicionado(s) com sucesso!` });
          }
        } else {
          toast({ title: `${data.length} item(ns) adicionado(s) com sucesso!` });
        }
      }
      setShowAI(false);
    },
    [id, items, toast]
  );

  const subtotal = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const total = subtotal - discount;
  const publishedOrigin = "https://propostaofp.lovable.app";
  const shareUrl = quote ? `${publishedOrigin}/quote/${quote.share_token}` : "";

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copiado!" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <AppLogo size="sm" />
          <div className="flex-1 min-w-0">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-0 bg-transparent text-lg font-semibold shadow-none focus-visible:ring-0 p-0 h-auto"
              placeholder="Título do orçamento"
            />
          </div>
          {quote?.status === "sent" && (
            <Badge variant="default">Enviado</Badge>
          )}
        </div>
      </header>

      <main className="container max-w-4xl py-6 space-y-6">
        {/* Client info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-lg">Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-lg">Itens do Orçamento</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowAI(true)}>
                  <Sparkles className="h-4 w-4" /> Extrair com IA
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={addItem}>
                  <Plus className="h-4 w-4" /> Adicionar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum item adicionado. Clique em "Adicionar" ou use a IA para extrair itens.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const typeConfig = itemTypeConfig[item.item_type];
                const Icon = typeConfig.icon;
                return (
                  <div key={item.id} className="rounded-lg border p-4 space-y-3 animate-fade-in">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <Select
                          value={item.item_type}
                          onValueChange={(v) => updateItem(item.id, { item_type: v as QuoteItemType })}
                        >
                          <SelectTrigger className="w-40 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {itemTypes.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Hotel selector - shown when type is hotel */}
                    {item.item_type === "hotel" && hotels.length > 0 && (
                      <HotelSelector
                        hotels={hotels}
                        hotelCovers={hotelCovers}
                        selectedHotelId={(item.metadata as any)?.hotel_id || null}
                        onSelect={(hotelId) => selectHotelForItem(item.id, hotelId)}
                      />
                    )}
                    {/* Ticket selector - shown when type is ticket */}
                    {item.item_type === "ticket" && tickets.length > 0 && (
                      <TicketSelector
                        tickets={tickets}
                        selectedTicketId={(item.metadata as any)?.ticket_id || null}
                        onSelect={(ticketId) => selectTicketForItem(item.id, ticketId)}
                      />
                    )}
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      placeholder="Descrição do item"
                      className="font-medium"
                    />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Data início</Label>
                        <Input
                          type="date"
                          value={item.start_date || ""}
                          onChange={(e) => updateItem(item.id, { start_date: e.target.value || null })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Data fim</Label>
                        <Input
                          type="date"
                          value={item.end_date || ""}
                          onChange={(e) => updateItem(item.id, { end_date: e.target.value || null })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor unitário (R$)</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={item.unit_price || ""}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
                            updateItem(item.id, { unit_price: parseFloat(raw) || 0 });
                          }}
                          onBlur={(e) => {
                            const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
                            updateItem(item.id, { unit_price: parseFloat(raw) || 0 });
                          }}
                          placeholder="0.00"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    {/* Fornecedores - visível apenas para o consultor */}
                    <div className="rounded-md border border-dashed border-muted-foreground/30 p-3 space-y-2 bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fornecedores (interno)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Fornecedor à vista</Label>
                          <div className="flex gap-2">
                            <Select
                              value={(item.metadata as any)?.fornecedor_avista || ""}
                              onValueChange={(v) => updateItem(item.id, { metadata: { ...(item.metadata as any), fornecedor_avista: v } as any })}
                            >
                              <SelectTrigger className="w-20 h-8 text-sm">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                {["HD", "JT", "SC", "AZ", "TR"].map((f) => (
                                  <SelectItem key={f} value={f}>{f}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={(item.metadata as any)?.preco_avista || ""}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
                                updateItem(item.id, { metadata: { ...(item.metadata as any), preco_avista: raw } as any });
                              }}
                              placeholder="Valor à vista"
                              className="h-8 text-sm flex-1"
                            />
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={(item.metadata as any)?.comissao_avista || ""}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
                                updateItem(item.id, { metadata: { ...(item.metadata as any), comissao_avista: raw } as any });
                              }}
                              placeholder="% comissão"
                              className="h-8 text-sm w-24"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Fornecedor parcelado</Label>
                          <div className="flex gap-2">
                            <Select
                              value={(item.metadata as any)?.fornecedor_parcelado || ""}
                              onValueChange={(v) => updateItem(item.id, { metadata: { ...(item.metadata as any), fornecedor_parcelado: v } as any })}
                            >
                              <SelectTrigger className="w-20 h-8 text-sm">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                {["HD", "JT", "SC", "AZ", "TR"].map((f) => (
                                  <SelectItem key={f} value={f}>{f}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={(item.metadata as any)?.preco_parcelado || ""}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
                                updateItem(item.id, { metadata: { ...(item.metadata as any), preco_parcelado: raw } as any });
                              }}
                              placeholder="Valor parcelado"
                              className="h-8 text-sm flex-1"
                            />
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={(item.metadata as any)?.comissao_parcelado || ""}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
                                updateItem(item.id, { metadata: { ...(item.metadata as any), comissao_parcelado: raw } as any });
                              }}
                              placeholder="% comissão"
                              className="h-8 text-sm w-24"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <Textarea
                      value={item.observations || ""}
                      onChange={(e) => updateItem(item.id, { observations: e.target.value || null })}
                      placeholder="Observações (opcional)"
                      className="min-h-[60px] text-sm"
                    />
                    <div className="text-right text-sm font-medium text-muted-foreground">
                      Subtotal: R$ {(item.unit_price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Notes & validity */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-lg">Condições e Notas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Validade do orçamento</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Desconto (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Parcelas (nº de vezes)</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={installmentCount}
                onChange={(e) => setInstallmentCount(parseInt(e.target.value) || 10)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notas gerais</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Condições de pagamento, observações gerais..."
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial summary */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Desconto</span>
                <span className="text-destructive">- R$ {discount.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-lg font-bold">
              <span>Total à vista</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
            {installmentCount > 1 && total > 0 && (
              <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                <span>ou {installmentCount}x de</span>
                <span>R$ {(total / installmentCount).toFixed(2)}</span>
              </div>
            )}
            {items.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setShowMarketAnalysis(true)}
                >
                  <TrendingUp className="h-4 w-4" />
                  Analisar Preço de Mercado
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Share link */}
        {quote?.status === "sent" && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <LinkIcon className="h-5 w-5 text-muted-foreground" />
              <Input value={shareUrl} readOnly className="flex-1 text-sm" />
              <Button variant="outline" size="sm" onClick={copyShareLink}>
                <Copy className="mr-2 h-4 w-4" /> Copiar
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur-md">
        <div className="container flex h-16 max-w-4xl items-center justify-end gap-3">
          <Button variant="outline" onClick={() => saveQuote()} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> Salvar rascunho
          </Button>
          {quote?.status === "draft" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={saving}>
                  <Send className="mr-2 h-4 w-4" /> Finalizar e compartilhar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finalizar orçamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O orçamento será marcado como enviado e um link compartilhável será gerado para o cliente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => saveQuote("sent")}>
                    Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {quote?.status === "sent" && (
            <Button onClick={copyShareLink} variant="default">
              <Copy className="mr-2 h-4 w-4" /> Copiar link do cliente
            </Button>
          )}
        </div>
      </div>

      {/* AI Modal */}
      <AIExtractModal open={showAI} onClose={() => setShowAI(false)} onConfirm={handleAIItems} />
      <MarketAnalysisModal
        open={showMarketAnalysis}
        onClose={() => setShowMarketAnalysis(false)}
        items={items}
        total={total}
      />
  );
}

function HotelSelector({
  hotels,
  hotelCovers,
  selectedHotelId,
  onSelect,
}: {
  hotels: HotelOption[];
  hotelCovers: Record<number, string>;
  selectedHotelId: number | null;
  onSelect: (hotelId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = hotels.find((h) => h.id === selectedHotelId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-9 text-sm">
          {selected ? (
            <div className="flex items-center gap-2 truncate">
              <Hotel className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{selected.nome_hotel}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{selected.regiao}</Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">Selecionar hotel cadastrado...</span>
          )}
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar hotel..." />
          <CommandList>
            <CommandEmpty>Nenhum hotel encontrado.</CommandEmpty>
            <CommandGroup>
              {hotels.map((hotel) => (
                <CommandItem
                  key={hotel.id}
                  value={hotel.nome_hotel}
                  onSelect={() => {
                    onSelect(hotel.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 py-2"
                >
                  <img
                    src={hotelCovers[hotel.id] || "/placeholder.svg"}
                    alt={hotel.nome_hotel}
                    className="h-10 w-14 rounded object-cover shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{hotel.nome_hotel}</p>
                    <p className="text-xs text-muted-foreground">
                      {hotel.regiao} · {hotel.categoria} · Público BR: {hotel.publico_brasileiro}
                    </p>
                  </div>
                  <Check className={cn("h-4 w-4 shrink-0", selectedHotelId === hotel.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function TicketSelector({
  tickets,
  selectedTicketId,
  onSelect,
}: {
  tickets: TicketOption[];
  selectedTicketId: number | null;
  onSelect: (ticketId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = tickets.find((t) => t.id === selectedTicketId);
  const groups = [...new Set(tickets.map((t) => t.grupo))];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-9 text-sm">
          {selected ? (
            <div className="flex items-center gap-2 truncate">
              <Ticket className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{selected.nome_ingresso}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{selected.grupo}</Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">Selecionar ingresso cadastrado...</span>
          )}
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar ingresso..." />
          <CommandList>
            <CommandEmpty>Nenhum ingresso encontrado.</CommandEmpty>
            {groups.map((grupo) => (
              <CommandGroup key={grupo} heading={grupo}>
                {tickets
                  .filter((t) => t.grupo === grupo)
                  .map((ticket) => (
                    <CommandItem
                      key={ticket.id}
                      value={`${ticket.nome_ingresso} ${ticket.grupo}`}
                      onSelect={() => {
                        onSelect(ticket.id);
                        setOpen(false);
                      }}
                      className="flex items-center gap-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ticket.nome_ingresso}</p>
                        <p className="text-xs text-muted-foreground">
                          {ticket.dias_validade ? `${ticket.dias_validade} dia(s)` : ""}
                          {ticket.preco_adulto ? ` · Adulto: R$ ${ticket.preco_adulto}` : ""}
                          {ticket.inclui_refeicao ? " · Com refeição" : ""}
                        </p>
                      </div>
                      <Check className={cn("h-4 w-4 shrink-0", selectedTicketId === ticket.id ? "opacity-100" : "opacity-0")} />
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
