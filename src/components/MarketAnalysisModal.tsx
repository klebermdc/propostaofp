import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { TrendingUp, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuoteItem {
  item_type: string;
  description: string;
  unit_price: number;
  quantity: number;
  start_date?: string | null;
  end_date?: string | null;
  observations?: string | null;
}

interface MarketAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  items: QuoteItem[];
  total: number;
}

export function MarketAnalysisModal({ open, onClose, items, total }: MarketAnalysisModalProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [sourcesCount, setSourcesCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runAnalysis = async () => {
    if (items.length === 0) {
      toast({ title: "Sem itens", description: "Adicione itens ao orçamento primeiro.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-market-price", {
        body: { items, total },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
      } else {
        setAnalysis(data.analysis);
        setSourcesCount(data.sources_count || 0);
      }
    } catch (err: any) {
      console.error("Market analysis error:", err);
      toast({ title: "Erro na análise", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Don't clear analysis so user can reopen and see it
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <TrendingUp className="h-5 w-5 text-primary" />
            Análise de Mercado
          </DialogTitle>
          <DialogDescription>
            Compara os preços do seu orçamento com VMZ Viagens, Tio Orlando, Decolar, Booking e outros
          </DialogDescription>
        </DialogHeader>

        {!analysis && !loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              A IA irá pesquisar preços em sites de agências brasileiras e comparar com seu orçamento de{" "}
              <strong>R$ {total.toFixed(2)}</strong> ({items.length} item(ns)).
            </p>
            <Button onClick={runAnalysis} className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Iniciar Análise de Mercado
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Pesquisando preços nos concorrentes...
            </p>
          </div>
        )}

        {analysis && (
          <ScrollArea className="flex-1 min-h-0 h-[60vh]">
            <div className="prose prose-sm max-w-none dark:prose-invert px-1 pb-4">
              {analysis.split("\n").map((line, i) => {
                if (line.startsWith("# ")) {
                  return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{line.slice(2)}</h2>;
                }
                if (line.startsWith("## ")) {
                  return <h3 key={i} className="text-base font-semibold mt-3 mb-1">{line.slice(3)}</h3>;
                }
                if (line.startsWith("### ")) {
                  return <h4 key={i} className="text-sm font-semibold mt-2 mb-1">{line.slice(4)}</h4>;
                }
                if (line.startsWith("- ") || line.startsWith("* ")) {
                  return <li key={i} className="ml-4 text-sm">{line.slice(2)}</li>;
                }
                if (line.trim() === "") return <br key={i} />;
                // Bold text
                const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return <p key={i} className="text-sm my-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
              })}
            </div>
            {sourcesCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2 px-1">
                📊 Baseado em {sourcesCount} resultado(s) de pesquisa web + conhecimento de mercado da IA.
              </p>
            )}
          </ScrollArea>
        )}

        {analysis && (
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => { setAnalysis(null); setSourcesCount(0); }}>
              Refazer análise
            </Button>
            <Button variant="outline" size="sm" onClick={handleClose}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
