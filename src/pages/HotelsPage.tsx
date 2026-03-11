import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, LogOut, Pencil, Trash2, Download, ArrowLeft } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { useToast } from "@/hooks/use-toast";

type HotelOrlando = {
  id: number;
  nome_hotel: string;
  marca: string | null;
  categoria: string;
  publico_brasileiro: string;
  regiao: string;
  endereco: string | null;
  cidade: string;
  estado: string;
  cep: string | null;
  pais: string;
  distancia_disney_km: number | null;
  distancia_universal_km: number | null;
  distancia_outlet_km: number | null;
  cafe_da_manha_incluso: boolean | null;
  estacionamento_tipo: string | null;
  estacionamento_valor_diaria: number | null;
  tipo_quarto_familia: string | null;
  idiomas_staff: string | null;
  site_oficial: string | null;
  telefone: string | null;
  email_reservas: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
};

const publicoBadge: Record<string, "default" | "secondary" | "destructive"> = {
  ALTO: "default",
  MEDIO: "secondary",
  BAIXO: "destructive",
};

export default function HotelsPage() {
  const { signOut } = useAuth();
  const [hotels, setHotels] = useState<HotelOrlando[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [publicoFilter, setPublicoFilter] = useState("all");
  const [regiaoFilter, setRegiaoFilter] = useState("all");
  const [categoriaFilter, setCategoriaFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [coverPhotos, setCoverPhotos] = useState<Record<number, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    const [hotelsRes, fotosRes] = await Promise.all([
      supabase.from("hoteis_orlando").select("*").order("nome_hotel"),
      supabase.from("hotel_fotos").select("*").eq("is_capa", true),
    ]);

    if (hotelsRes.error) {
      toast({ title: "Erro ao carregar hotéis", description: hotelsRes.error.message, variant: "destructive" });
    } else {
      setHotels((hotelsRes.data as unknown as HotelOrlando[]) || []);
    }

    if (fotosRes.data) {
      const covers: Record<number, string> = {};
      for (const foto of fotosRes.data as any[]) {
        covers[foto.hotel_id] = foto.url;
      }
      setCoverPhotos(covers);
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("hoteis_orlando").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Hotel excluído com sucesso" });
      setHotels((prev) => prev.filter((h) => h.id !== deleteId));
    }
    setDeleteId(null);
  };

  const regioes = [...new Set(hotels.map((h) => h.regiao))].sort();
  const categorias = [...new Set(hotels.map((h) => h.categoria))].sort();

  const filtered = hotels.filter((h) => {
    const matchSearch =
      !search ||
      h.nome_hotel.toLowerCase().includes(search.toLowerCase()) ||
      h.marca?.toLowerCase().includes(search.toLowerCase());
    const matchPublico = publicoFilter === "all" || h.publico_brasileiro === publicoFilter;
    const matchRegiao = regiaoFilter === "all" || h.regiao === regiaoFilter;
    const matchCategoria = categoriaFilter === "all" || h.categoria === categoriaFilter;
    return matchSearch && matchPublico && matchRegiao && matchCategoria;
  });

  const exportCSV = () => {
    const headers = [
      "ID", "Nome", "Marca", "Categoria", "Público Brasileiro", "Região",
      "Endereço", "Cidade", "Estado", "CEP", "País",
      "Dist. Disney (km)", "Dist. Universal (km)", "Dist. Outlet (km)",
      "Café Incluso", "Estacionamento", "Valor Estac.",
      "Tipo Quarto Família", "Idiomas Staff", "Site", "Telefone", "Email", "Observações",
    ];
    const rows = filtered.map((h) => [
      h.id, h.nome_hotel, h.marca ?? "", h.categoria, h.publico_brasileiro, h.regiao,
      h.endereco ?? "", h.cidade, h.estado, h.cep ?? "", h.pais,
      h.distancia_disney_km ?? "", h.distancia_universal_km ?? "", h.distancia_outlet_km ?? "",
      h.cafe_da_manha_incluso ? "Sim" : "Não", h.estacionamento_tipo ?? "", h.estacionamento_valor_diaria ?? "",
      h.tipo_quarto_familia ?? "", h.idiomas_staff ?? "", h.site_oficial ?? "", h.telefone ?? "", h.email_reservas ?? "", h.observacoes ?? "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hoteis_orlando_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <AppLogo size="sm" />
            <span className="font-display text-lg font-bold">Hotéis Orlando</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="container py-8">
        {/* Info banner */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <strong>📋 Base de Hotéis Orlando</strong> — Este banco de dados é pensado para operadoras e agências de viagens do Brasil que vendem hotéis em Orlando para o público brasileiro. Cadastre, gerencie e exporte informações dos hotéis para uso em cotações e sistemas internos.
          </CardContent>
        </Card>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Hotéis em Orlando</h1>
            <p className="text-muted-foreground">{filtered.length} hotéis encontrados</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button onClick={() => navigate("/hotels/new")} className="gap-2">
              <Plus className="h-5 w-5" /> Novo Hotel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={publicoFilter} onValueChange={setPublicoFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Público" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos públicos</SelectItem>
              <SelectItem value="ALTO">Alto</SelectItem>
              <SelectItem value="MEDIO">Médio</SelectItem>
              <SelectItem value="BAIXO">Baixo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={regiaoFilter} onValueChange={setRegiaoFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Região" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas regiões</SelectItem>
              {regioes.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Hotel className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="mb-1 text-lg font-medium">Nenhum hotel encontrado</p>
              <p className="mb-6 text-sm text-muted-foreground">Adicione seu primeiro hotel para começar</p>
              <Button onClick={() => navigate("/hotels/new")} className="gap-2">
                <Plus className="h-4 w-4" /> Novo Hotel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Foto</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Região</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Público BR</TableHead>
                  <TableHead className="hidden md:table-cell">Café</TableHead>
                  <TableHead className="hidden lg:table-cell">Dist. Disney</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((hotel) => (
                  <TableRow key={hotel.id}>
                    <TableCell className="w-16 p-2">
                      <img
                        src={coverPhotos[hotel.id] || "/placeholder.svg"}
                        alt={hotel.nome_hotel}
                        className="h-12 w-16 rounded object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{hotel.nome_hotel}</p>
                        {hotel.marca && <p className="text-xs text-muted-foreground">{hotel.marca}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{hotel.regiao}</TableCell>
                    <TableCell className="capitalize">{hotel.categoria}</TableCell>
                    <TableCell>
                      <Badge variant={publicoBadge[hotel.publico_brasileiro] ?? "secondary"}>
                        {hotel.publico_brasileiro}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {hotel.cafe_da_manha_incluso ? "Sim" : "Não"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {hotel.distancia_disney_km != null ? `${hotel.distancia_disney_km} km` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/hotels/${hotel.id}/edit`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(hotel.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir hotel?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O hotel será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
