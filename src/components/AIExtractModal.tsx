import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Upload, Link, Loader2, Check, X, Trash2, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { itemTypes, itemTypeConfig } from "@/lib/quote-item-types";
import type { Database } from "@/integrations/supabase/types";

type QuoteItemInsert = Database["public"]["Tables"]["quote_items"]["Insert"];
type QuoteItemType = Database["public"]["Enums"]["quote_item_type"];

interface ExtractedItem {
  item_type: QuoteItemType;
  description: string;
  start_date?: string | null;
  end_date?: string | null;
  unit_price: number;
  quantity: number;
  observations?: string | null;
  metadata?: Record<string, any> | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (items: Omit<QuoteItemInsert, "quote_id">[], totalAVista?: number) => void;
}

export function AIExtractModal({ open, onClose, onConfirm }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const [cartUrl, setCartUrl] = useState("");
  const [cartText, setCartText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [step, setStep] = useState<"input" | "preview">("input");
  const { toast } = useToast();

  const reset = () => {
    setImageUrl("");
    setCartUrl("");
    setCartText("");
    setFile(null);
    setExtractedItems([]);
    setStep("input");
    setExtracting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const enrichWithDatabase = async (items: ExtractedItem[]): Promise<ExtractedItem[]> => {
    try {
      const [ticketsRes, hotelsRes] = await Promise.all([
        supabase
          .from("ingressos_orlando")
          .select("nome_ingresso, grupo, preco_adulto, preco_crianca, dias_validade, categoria, id"),
        supabase
          .from("hoteis_orlando")
          .select("id, nome_hotel, marca, regiao, categoria, cafe_da_manha_incluso, estacionamento_tipo, tipo_quarto_familia, publico_brasileiro, distancia_disney_km, distancia_universal_km"),
      ]);

      const tickets = ticketsRes.data || [];
      const hotels = hotelsRes.data || [];

      return items.map((item) => {
        // --- Hotel matching ---
        if (item.item_type === "hotel" && hotels.length > 0) {
          const desc = item.description.toLowerCase();
          let bestMatch: (typeof hotels)[0] | null = null;
          let bestScore = 0;

          for (const hotel of hotels) {
            const name = hotel.nome_hotel.toLowerCase();
            let score = 0;

            // Exact name match
            if (desc.includes(name)) {
              score += 10;
            } else {
              // Word-by-word matching
              const nameWords = name.split(/\s+/);
              for (const word of nameWords) {
                if (word.length > 2 && desc.includes(word)) score++;
              }
            }
            // Brand match
            if (hotel.marca && desc.includes(hotel.marca.toLowerCase())) score += 3;

            if (score > bestScore) {
              bestScore = score;
              bestMatch = hotel;
            }
          }

          if (bestMatch && bestScore >= 3) {
            const details = [
              bestMatch.regiao && `Região: ${bestMatch.regiao}`,
              bestMatch.categoria && `Categoria: ${bestMatch.categoria}`,
              bestMatch.cafe_da_manha_incluso ? "Café da manhã incluso" : null,
              bestMatch.estacionamento_tipo && `Estacionamento: ${bestMatch.estacionamento_tipo}`,
              bestMatch.tipo_quarto_familia && `Quarto: ${bestMatch.tipo_quarto_familia}`,
              bestMatch.distancia_disney_km != null && `Disney: ${bestMatch.distancia_disney_km}km`,
              bestMatch.distancia_universal_km != null && `Universal: ${bestMatch.distancia_universal_km}km`,
            ].filter(Boolean).join(" | ");

            return {
              ...item,
              description: `${bestMatch.nome_hotel}${bestMatch.marca ? ` (${bestMatch.marca})` : ""}`,
              observations: details,
              metadata: { hotel_id: bestMatch.id, hotel_nome: bestMatch.nome_hotel },
            };
          }
        }

        // --- Ticket matching ---
        if (item.item_type === "ticket" && tickets.length > 0) {
          if (item.unit_price > 0) return item;

          const desc = item.description.toLowerCase();
          let bestMatch: (typeof tickets)[0] | null = null;
          let bestScore = 0;

          for (const ticket of tickets) {
            const name = ticket.nome_ingresso.toLowerCase();
            const grupo = ticket.grupo.toLowerCase();
            let score = 0;

            const nameWords = name.split(/\s+/);
            for (const word of nameWords) {
              if (word.length > 2 && desc.includes(word)) score++;
            }
            if (desc.includes(grupo)) score += 2;
            if (desc.includes(name)) score += 5;

            if (score > bestScore) {
              bestScore = score;
              bestMatch = ticket;
            }
          }

          if (bestMatch && bestScore >= 3 && bestMatch.preco_adulto) {
            return {
              ...item,
              unit_price: Number(bestMatch.preco_adulto),
              metadata: { ticket_id: bestMatch.id, ticket_nome: bestMatch.nome_ingresso },
              observations: [
                item.observations,
                `Preço ref. base: ${bestMatch.nome_ingresso}`,
              ].filter(Boolean).join(" | "),
            };
          }
        }

        return item;
      });
    } catch {
      return items;
    }
  };

  const extract = async () => {
    setExtracting(true);
    try {
      let payload: { image_url?: string; file_path?: string; cart_url?: string } = {};

      if (cartUrl || cartText) {
        // Combine URL and pasted text
        let combinedCart = cartUrl || "";
        if (cartText) {
          combinedCart = combinedCart ? `${combinedCart}\n\n${cartText}` : cartText;
        }
        payload.cart_url = combinedCart;
      } else if (file) {
        // Upload to storage
        const ext = file.name.split(".").pop();
        const path = `ai-extractions/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("quote-uploads")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("quote-uploads").getPublicUrl(path);
        payload.file_path = path;
        payload.image_url = urlData.publicUrl;
      } else if (imageUrl) {
        payload.image_url = imageUrl;
      } else {
        toast({ title: "Forneça uma imagem, PDF ou link do carrinho", variant: "destructive" });
        setExtracting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("extract-quote-items", {
        body: payload,
      });

      if (error) throw error;

      if (data?.items && data.items.length > 0) {
        // Try to match extracted items against the ingressos_orlando table to fill prices
        const enrichedItems = await enrichWithDatabase(data.items);
        setExtractedItems(enrichedItems);
        setStep("preview");
      } else {
        toast({
          title: "Nenhum item encontrado",
          description: "A IA não conseguiu extrair itens do conteúdo fornecido.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro na extração",
        description: error.message || "Falha ao processar o conteúdo",
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
    }
  };

  const updateExtracted = (index: number, updates: Partial<ExtractedItem>) => {
    setExtractedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const removeExtracted = (index: number) => {
    setExtractedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmItems = () => {
    onConfirm(
      extractedItems.map((item) => ({
        item_type: item.item_type,
        description: item.description,
        start_date: item.start_date || null,
        end_date: item.end_date || null,
        unit_price: item.unit_price,
        quantity: item.quantity,
        observations: item.observations || null,
        metadata: item.metadata || null,
      }))
    );
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="h-5 w-5 text-accent" />
            Extração Inteligente com IA
          </DialogTitle>
          <DialogDescription>
            {step === "input"
              ? "Cole o link de uma imagem ou faça upload de um PDF para extrair automaticamente os itens do orçamento."
              : "Revise e ajuste os itens extraídos antes de adicioná-los ao orçamento."}
          </DialogDescription>
        </DialogHeader>

        {step === "input" ? (
          <div className="space-y-4">
            <Tabs defaultValue="cart">
              <TabsList className="w-full">
                <TabsTrigger value="cart" className="flex-1 gap-2">
                  <ShoppingCart className="h-4 w-4" /> Link do carrinho
                </TabsTrigger>
                <TabsTrigger value="url" className="flex-1 gap-2">
                  <Link className="h-4 w-4" /> Imagem
                </TabsTrigger>
                <TabsTrigger value="file" className="flex-1 gap-2">
                  <Upload className="h-4 w-4" /> Arquivo
                </TabsTrigger>
              </TabsList>
              <TabsContent value="cart" className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label>URL do carrinho / checkout (opcional)</Label>
                  <Input
                    value={cartUrl}
                    onChange={(e) => setCartUrl(e.target.value)}
                    placeholder="https://reservas.orlandofastpass.com.br/pt/checkout/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conteúdo do carrinho (cole aqui o texto com preços)</Label>
                  <Textarea
                    value={cartText}
                    onChange={(e) => setCartText(e.target.value)}
                    placeholder={"Copie e cole o conteúdo do carrinho aqui, incluindo:\n- Nomes dos produtos\n- Preços (R$ ou US$)\n- Quantidades\n- Datas\n\nEx:\nDisney 4 Parks Magic Ticket [4 dias]\nR$ 1.890,00\n1 Adulto - 11/03/2026"}
                    className="min-h-[120px] text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Cole o link e/ou o texto do carrinho com os preços que aparecem na tela.
                </p>
              </TabsContent>
              <TabsContent value="url" className="mt-4 space-y-2">
                <Label>URL da imagem</Label>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/cotacao.png"
                />
                <p className="text-xs text-muted-foreground">
                  Cole o link de uma imagem de cotação, screenshot ou documento.
                </p>
              </TabsContent>
              <TabsContent value="file" className="mt-4 space-y-2">
                <Label>Arquivo (PDF ou imagem)</Label>
                <Input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  Faça upload de um PDF de cotação ou imagem (máx. 10MB).
                </p>
              </TabsContent>
            </Tabs>

            <Button
              onClick={extract}
              disabled={extracting || (!imageUrl && !file && !cartUrl && !cartText)}
              className="w-full gap-2"
            >
              {extracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Extraindo...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Extrair itens
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {extractedItems.length} item(ns) encontrado(s). Edite conforme necessário:
            </p>

            {extractedItems.map((item, index) => {
              const config = itemTypeConfig[item.item_type];
              const Icon = config.icon;
              return (
                <div key={index} className="rounded-lg border p-4 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <Select
                        value={item.item_type}
                        onValueChange={(v) => updateExtracted(index, { item_type: v as QuoteItemType })}
                      >
                        <SelectTrigger className="w-36 h-8 text-sm">
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
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeExtracted(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={item.description}
                      onChange={(e) => updateExtracted(index, { description: e.target.value })}
                      className="text-sm"
                    />
                    {item.metadata?.hotel_id && (
                      <Badge className="whitespace-nowrap gap-1 bg-green-500/10 text-green-600 border-green-500/30">
                        <Check className="h-3 w-3" /> Base interna
                      </Badge>
                    )}
                    {item.metadata?.ticket_id && (
                      <Badge className="whitespace-nowrap gap-1 bg-blue-500/10 text-blue-600 border-blue-500/30">
                        <Check className="h-3 w-3" /> Base interna
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <Label className="text-xs">Início</Label>
                      <Input
                        type="date"
                        value={item.start_date || ""}
                        onChange={(e) => updateExtracted(index, { start_date: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fim</Label>
                      <Input
                        type="date"
                        value={item.end_date || ""}
                        onChange={(e) => updateExtracted(index, { end_date: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={item.unit_price || ""}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
                          updateExtracted(index, { unit_price: parseFloat(raw) || 0 });
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateExtracted(index, { quantity: parseInt(e.target.value) || 1 })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setStep("input")}>
                <X className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={confirmItems} disabled={extractedItems.length === 0}>
                <Check className="mr-2 h-4 w-4" /> Adicionar {extractedItems.length} item(ns)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
