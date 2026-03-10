import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Plane, LogOut, FileText, Clock, CheckCircle, Send, Hotel, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Quote = Database["public"]["Tables"]["quotes"]["Row"];
type QuoteStatus = Database["public"]["Enums"]["quote_status"];

const statusConfig: Record<QuoteStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  draft: { label: "Rascunho", variant: "secondary", icon: <FileText className="h-3 w-3" /> },
  sent: { label: "Enviado", variant: "default", icon: <Send className="h-3 w-3" /> },
  accepted: { label: "Aceito", variant: "outline", icon: <CheckCircle className="h-3 w-3" /> },
  expired: { label: "Expirado", variant: "destructive", icon: <Clock className="h-3 w-3" /> },
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar orçamentos", description: error.message, variant: "destructive" });
    } else {
      setQuotes(data || []);
    }
    setLoading(false);
  };

  const createNewQuote = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("quotes")
      .insert({ agent_id: user.id, title: "Novo Orçamento" })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else if (data) {
      navigate(`/quotes/${data.id}/edit`);
    }
  };

  const filtered = quotes.filter((q) => {
    const matchesSearch =
      !search ||
      q.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (val: number, currency: string) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(val);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Plane className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">Lovable Travel</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/hotels")} className="gap-2">
              <Hotel className="h-4 w-4" /> Hotéis
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Orçamentos</h1>
            <p className="text-muted-foreground">Gerencie seus orçamentos de viagens</p>
          </div>
          <Button onClick={createNewQuote} size="lg" className="gap-2">
            <Plus className="h-5 w-5" /> Novo Orçamento
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="accepted">Aceito</SelectItem>
              <SelectItem value="expired">Expirado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quote list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="mb-1 text-lg font-medium">Nenhum orçamento encontrado</p>
              <p className="mb-6 text-sm text-muted-foreground">Crie seu primeiro orçamento para começar</p>
              <Button onClick={createNewQuote} className="gap-2">
                <Plus className="h-4 w-4" /> Novo Orçamento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((quote) => {
              const config = statusConfig[quote.status];
              return (
                <Link key={quote.id} to={`/quotes/${quote.id}/edit`}>
                  <Card className="transition-all hover:shadow-md hover:border-primary/20">
                    <CardContent className="flex items-center justify-between p-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="truncate font-semibold">{quote.title}</h3>
                          <Badge variant={config.variant} className="gap-1 text-xs">
                            {config.icon} {config.label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {quote.client_name || "Sem cliente definido"}
                          {quote.valid_until && (
                            <span className="ml-3">
                              Válido até {new Date(quote.valid_until).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(quote.updated_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
