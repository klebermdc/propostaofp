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
import { Plus, Search, LogOut, Pencil, Trash2, Download, ArrowLeft, Utensils, Ticket } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { useToast } from "@/hooks/use-toast";

type Ingresso = {
  id: number;
  nome_ingresso: string;
  grupo: string;
  categoria: string | null;
  dias_validade: number | null;
  inclui_refeicao: boolean | null;
  preco_adulto: number | null;
  preco_crianca: number | null;
  observacoes: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};

const grupoBadge: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Disney: "default",
  Universal: "secondary",
  SeaWorld: "outline",
  LEGOLAND: "destructive",
};

export default function IngressosPage() {
  const { signOut } = useAuth();
  const [ingressos, setIngressos] = useState<Ingresso[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grupoFilter, setGrupoFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchIngressos();
  }, []);

  const fetchIngressos = async () => {
    const { data, error } = await supabase
      .from("ingressos_orlando")
      .select("*")
      .order("grupo")
      .order("nome_ingresso");

    if (error) {
      toast({ title: "Erro ao carregar ingressos", description: error.message, variant: "destructive" });
    } else {
      setIngressos((data as unknown as Ingresso[]) || []);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("ingressos_orlando").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ingresso excluído com sucesso" });
      setIngressos((prev) => prev.filter((i) => i.id !== deleteId));
    }
    setDeleteId(null);
  };

  const grupos = [...new Set(ingressos.map((i) => i.grupo))].sort();

  const filtered = ingressos.filter((i) => {
    const matchSearch =
      !search ||
      i.nome_ingresso.toLowerCase().includes(search.toLowerCase()) ||
      i.categoria?.toLowerCase().includes(search.toLowerCase());
    const matchGrupo = grupoFilter === "all" || i.grupo === grupoFilter;
    return matchSearch && matchGrupo;
  });

  const exportCSV = () => {
    const headers = ["ID", "Nome", "Grupo", "Categoria", "Dias Validade", "Inclui Refeição", "Preço Adulto", "Preço Criança", "Observações"];
    const rows = filtered.map((i) => [
      i.id, i.nome_ingresso, i.grupo, i.categoria ?? "", i.dias_validade ?? "",
      i.inclui_refeicao ? "Sim" : "Não", i.preco_adulto ?? "", i.preco_crianca ?? "", i.observacoes ?? "",
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ingressos_orlando_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatPrice = (val: number | null) =>
    val != null ? `R$ ${val.toFixed(2)}` : "—";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <AppLogo size="sm" />
            <span className="font-display text-lg font-bold">Ingressos Orlando</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <strong>🎟️ Base de Ingressos Orlando</strong> — Gerencie ingressos de parques temáticos para uso em cotações. Cadastre produtos comerciais de Disney, Universal, SeaWorld, LEGOLAND e outros.
          </CardContent>
        </Card>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Ingressos em Orlando</h1>
            <p className="text-muted-foreground">{filtered.length} ingressos encontrados</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button onClick={() => navigate("/ingressos/new")} className="gap-2">
              <Plus className="h-5 w-5" /> Novo Ingresso
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={grupoFilter} onValueChange={setGrupoFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {grupos.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
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
              <Ticket className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="mb-1 text-lg font-medium">Nenhum ingresso encontrado</p>
              <p className="mb-6 text-sm text-muted-foreground">Adicione seu primeiro ingresso para começar</p>
              <Button onClick={() => navigate("/ingressos/new")} className="gap-2">
                <Plus className="h-4 w-4" /> Novo Ingresso
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingresso</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="hidden md:table-cell">Dias</TableHead>
                  <TableHead className="hidden md:table-cell">Refeição</TableHead>
                  <TableHead className="hidden lg:table-cell">Adulto</TableHead>
                  <TableHead className="hidden lg:table-cell">Criança</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ingresso) => (
                  <TableRow key={ingresso.id}>
                    <TableCell>
                      <p className="font-medium">{ingresso.nome_ingresso}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={grupoBadge[ingresso.grupo] ?? "secondary"}>
                        {ingresso.grupo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ingresso.categoria || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {ingresso.dias_validade ? `${ingresso.dias_validade}d` : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {ingresso.inclui_refeicao ? (
                        <Utensils className="h-4 w-4 text-primary" />
                      ) : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatPrice(ingresso.preco_adulto)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatPrice(ingresso.preco_crianca)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/ingressos/${ingresso.id}/edit`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(ingresso.id)}>
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
            <AlertDialogTitle>Excluir ingresso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O ingresso será removido permanentemente.
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
