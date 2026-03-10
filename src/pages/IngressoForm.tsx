import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GRUPOS = ["Disney", "Universal", "SeaWorld", "LEGOLAND", "Outro"];

type FormData = {
  nome_ingresso: string;
  grupo: string;
  categoria: string;
  dias_validade: string;
  inclui_refeicao: boolean;
  preco_adulto: string;
  preco_crianca: string;
  observacoes: string;
};

const emptyForm: FormData = {
  nome_ingresso: "",
  grupo: "",
  categoria: "",
  dias_validade: "",
  inclui_refeicao: false,
  preco_adulto: "",
  preco_crianca: "",
  observacoes: "",
};

export default function IngressoForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit) loadIngresso();
  }, [id]);

  const loadIngresso = async () => {
    const { data, error } = await supabase
      .from("ingressos_orlando")
      .select("*")
      .eq("id", Number(id))
      .single();

    if (error || !data) {
      toast({ title: "Ingresso não encontrado", variant: "destructive" });
      navigate("/ingressos");
      return;
    }

    setForm({
      nome_ingresso: data.nome_ingresso,
      grupo: data.grupo,
      categoria: data.categoria || "",
      dias_validade: data.dias_validade?.toString() || "",
      inclui_refeicao: data.inclui_refeicao || false,
      preco_adulto: data.preco_adulto?.toString() || "",
      preco_crianca: data.preco_crianca?.toString() || "",
      observacoes: data.observacoes || "",
    });
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.nome_ingresso.trim() || !form.grupo) {
      toast({ title: "Preencha nome e grupo", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      nome_ingresso: form.nome_ingresso.trim(),
      grupo: form.grupo,
      categoria: form.categoria || null,
      dias_validade: form.dias_validade ? Number(form.dias_validade) : null,
      inclui_refeicao: form.inclui_refeicao,
      preco_adulto: form.preco_adulto ? Number(form.preco_adulto) : null,
      preco_crianca: form.preco_crianca ? Number(form.preco_crianca) : null,
      observacoes: form.observacoes || null,
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase
        .from("ingressos_orlando")
        .update(payload)
        .eq("id", Number(id)));
    } else {
      ({ error } = await supabase.from("ingressos_orlando").insert(payload));
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isEdit ? "Ingresso atualizado!" : "Ingresso cadastrado!" });
      navigate("/ingressos");
    }
    setSaving(false);
  };

  const set = (field: keyof FormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/ingressos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Ticket className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-bold">
              {isEdit ? "Editar Ingresso" : "Novo Ingresso"}
            </span>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </header>

      <main className="container max-w-2xl py-8 space-y-6">
        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações do Ingresso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome do Ingresso *</Label>
              <Input
                value={form.nome_ingresso}
                onChange={(e) => set("nome_ingresso", e.target.value)}
                placeholder="Ex: Disney 4 Dias Base"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Grupo / Parque *</Label>
                <Select value={form.grupo} onValueChange={(v) => set("grupo", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRUPOS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Input
                  value={form.categoria}
                  onChange={(e) => set("categoria", e.target.value)}
                  placeholder="Ex: Base, Hopper, Park-to-Park"
                />
              </div>
            </div>

            <div>
              <Label>Dias de Validade</Label>
              <Input
                type="number"
                value={form.dias_validade}
                onChange={(e) => set("dias_validade", e.target.value)}
                placeholder="Ex: 14"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.inclui_refeicao}
                onCheckedChange={(v) => set("inclui_refeicao", v)}
              />
              <Label>Inclui refeição ilimitada</Label>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preços (referência)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preço Adulto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.preco_adulto}
                onChange={(e) => set("preco_adulto", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Preço Criança (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.preco_crianca}
                onChange={(e) => set("preco_crianca", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              placeholder="Detalhes adicionais sobre o ingresso..."
              rows={3}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
