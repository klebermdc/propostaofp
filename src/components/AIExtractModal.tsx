import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (items: Omit<QuoteItemInsert, "quote_id">[]) => void;
}

export function AIExtractModal({ open, onClose, onConfirm }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const [cartUrl, setCartUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [step, setStep] = useState<"input" | "preview">("input");
  const { toast } = useToast();

  const reset = () => {
    setImageUrl("");
    setCartUrl("");
    setFile(null);
    setExtractedItems([]);
    setStep("input");
    setExtracting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const extract = async () => {
    setExtracting(true);
    try {
      let payload: { image_url?: string; file_path?: string; cart_url?: string } = {};

      if (cartUrl) {
        payload.cart_url = cartUrl;
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
        setExtractedItems(data.items);
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
              <TabsContent value="cart" className="mt-4 space-y-2">
                <Label>URL do carrinho / checkout</Label>
                <Input
                  value={cartUrl}
                  onChange={(e) => setCartUrl(e.target.value)}
                  placeholder="https://reservas.orlandofastpass.com.br/pt/checkout/..."
                />
                <p className="text-xs text-muted-foreground">
                  Cole o link do carrinho ou checkout do seu site de reservas para importar os itens automaticamente.
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
              disabled={extracting || (!imageUrl && !file && !cartUrl)}
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
                  <Input
                    value={item.description}
                    onChange={(e) => updateExtracted(index, { description: e.target.value })}
                    className="text-sm"
                  />
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
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unit_price}
                        onChange={(e) => updateExtracted(index, { unit_price: parseFloat(e.target.value) || 0 })}
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
