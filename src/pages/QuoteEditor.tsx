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
} from "lucide-react";
import { itemTypeConfig, itemTypes } from "@/lib/quote-item-types";
import { AIExtractModal } from "@/components/AIExtractModal";
import type { Database } from "@/integrations/supabase/types";

type Quote = Database["public"]["Tables"]["quotes"]["Row"];
type QuoteItem = Database["public"]["Tables"]["quote_items"]["Row"];
type QuoteItemInsert = Database["public"]["Tables"]["quote_items"]["Insert"];
type QuoteItemType = Database["public"]["Enums"]["quote_item_type"];

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

  // Form fields
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    if (id) fetchQuote();
  }, [id]);

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
        ...(newStatus ? { status: newStatus } : {}),
      })
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
    async (extractedItems: Omit<QuoteItemInsert, "quote_id">[]) => {
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
        setItems((prev) => [...prev, ...data]);
        toast({ title: `${data.length} item(ns) adicionado(s) com sucesso!` });
      }
      setShowAI(false);
    },
    [id, items.length, toast]
  );

  const subtotal = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const total = subtotal - discount;
  const shareUrl = quote ? `${window.location.origin}/quote/${quote.share_token}` : "";

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
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unit_price}
                          onChange={(e) => updateItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
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
              <span>Total</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
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
    </div>
  );
}
