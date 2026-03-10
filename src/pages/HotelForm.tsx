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
import { ArrowLeft, Save, Hotel } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MARCAS = ["Hilton", "Marriott", "Rosen", "Disney", "Universal", "Independente", "Outra"];
const CATEGORIAS = ["resort", "hotel", "suíte", "luxo", "econômico"];
const PUBLICOS = ["ALTO", "MEDIO", "BAIXO"];
const REGIOES = ["Disney", "Universal", "International Drive", "Lake Buena Vista", "Aeroporto", "Celebration", "Kissimmee", "Outra"];
const ESTACIONAMENTOS = ["gratuito", "pago", "não possui"];

type FormData = {
  nome_hotel: string;
  marca: string;
  categoria: string;
  publico_brasileiro: string;
  regiao: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  pais: string;
  distancia_disney_km: string;
  distancia_universal_km: string;
  distancia_outlet_km: string;
  cafe_da_manha_incluso: boolean;
  estacionamento_tipo: string;
  estacionamento_valor_diaria: string;
  tipo_quarto_familia: string;
  idiomas_staff: string;
  site_oficial: string;
  telefone: string;
  email_reservas: string;
  observacoes: string;
};

const emptyForm: FormData = {
  nome_hotel: "",
  marca: "",
  categoria: "",
  publico_brasileiro: "",
  regiao: "",
  endereco: "",
  cidade: "Orlando",
  estado: "FL",
  cep: "",
  pais: "Estados Unidos",
  distancia_disney_km: "",
  distancia_universal_km: "",
  distancia_outlet_km: "",
  cafe_da_manha_incluso: false,
  estacionamento_tipo: "gratuito",
  estacionamento_valor_diaria: "",
  tipo_quarto_familia: "",
  idiomas_staff: "",
  site_oficial: "",
  telefone: "",
  email_reservas: "",
  observacoes: "",
};

export default function HotelForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      supabase
        .from("hoteis_orlando")
        .select("*")
        .eq("id", Number(id))
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            toast({ title: "Hotel não encontrado", variant: "destructive" });
            navigate("/hotels");
            return;
          }
          const d = data as any;
          setForm({
            nome_hotel: d.nome_hotel ?? "",
            marca: d.marca ?? "",
            categoria: d.categoria ?? "",
            publico_brasileiro: d.publico_brasileiro ?? "",
            regiao: d.regiao ?? "",
            endereco: d.endereco ?? "",
            cidade: d.cidade ?? "Orlando",
            estado: d.estado ?? "FL",
            cep: d.cep ?? "",
            pais: d.pais ?? "Estados Unidos",
            distancia_disney_km: d.distancia_disney_km?.toString() ?? "",
            distancia_universal_km: d.distancia_universal_km?.toString() ?? "",
            distancia_outlet_km: d.distancia_outlet_km?.toString() ?? "",
            cafe_da_manha_incluso: d.cafe_da_manha_incluso ?? false,
            estacionamento_tipo: d.estacionamento_tipo ?? "gratuito",
            estacionamento_valor_diaria: d.estacionamento_valor_diaria?.toString() ?? "",
            tipo_quarto_familia: d.tipo_quarto_familia ?? "",
            idiomas_staff: d.idiomas_staff ?? "",
            site_oficial: d.site_oficial ?? "",
            telefone: d.telefone ?? "",
            email_reservas: d.email_reservas ?? "",
            observacoes: d.observacoes ?? "",
          });
          setLoading(false);
        });
    }
  }, [id]);

  const set = (key: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.nome_hotel.trim()) {
      toast({ title: "Nome do hotel é obrigatório", variant: "destructive" });
      return;
    }
    if (!form.publico_brasileiro) {
      toast({ title: "Público brasileiro é obrigatório", variant: "destructive" });
      return;
    }
    if (!form.regiao) {
      toast({ title: "Região é obrigatória", variant: "destructive" });
      return;
    }
    if (!form.categoria) {
      toast({ title: "Categoria é obrigatória", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload: any = {
      nome_hotel: form.nome_hotel.trim(),
      marca: form.marca || null,
      categoria: form.categoria,
      publico_brasileiro: form.publico_brasileiro,
      regiao: form.regiao,
      endereco: form.endereco || null,
      cidade: form.cidade,
      estado: form.estado,
      cep: form.cep || null,
      pais: form.pais,
      distancia_disney_km: form.distancia_disney_km ? Number(form.distancia_disney_km) : null,
      distancia_universal_km: form.distancia_universal_km ? Number(form.distancia_universal_km) : null,
      distancia_outlet_km: form.distancia_outlet_km ? Number(form.distancia_outlet_km) : null,
      cafe_da_manha_incluso: form.cafe_da_manha_incluso,
      estacionamento_tipo: form.estacionamento_tipo || null,
      estacionamento_valor_diaria: form.estacionamento_valor_diaria ? Number(form.estacionamento_valor_diaria) : null,
      tipo_quarto_familia: form.tipo_quarto_familia || null,
      idiomas_staff: form.idiomas_staff || null,
      site_oficial: form.site_oficial || null,
      telefone: form.telefone || null,
      email_reservas: form.email_reservas || null,
      observacoes: form.observacoes || null,
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from("hoteis_orlando").update(payload).eq("id", Number(id)));
    } else {
      ({ error } = await supabase.from("hoteis_orlando").insert(payload));
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isEdit ? "Hotel atualizado!" : "Hotel cadastrado!" });
      navigate("/hotels");
    }
    setSaving(false);
  };

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
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/hotels")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Hotel className="h-5 w-5 text-primary" />
          <span className="font-display text-lg font-bold">
            {isEdit ? "Editar Hotel" : "Novo Hotel"}
          </span>
        </div>
      </header>

      <main className="container max-w-3xl py-8">
        <div className="grid gap-6">
          {/* Dados Principais */}
          <Card>
            <CardHeader><CardTitle>Dados Principais</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label>Nome do Hotel *</Label>
                <Input value={form.nome_hotel} onChange={(e) => set("nome_hotel", e.target.value)} placeholder="Ex: Hilton Orlando Buena Vista Palace" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Marca</Label>
                  <Select value={form.marca} onValueChange={(v) => set("marca", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {MARCAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Categoria *</Label>
                  <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Público Brasileiro *</Label>
                  <Select value={form.publico_brasileiro} onValueChange={(v) => set("publico_brasileiro", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {PUBLICOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Região *</Label>
                  <Select value={form.regiao} onValueChange={(v) => set("regiao", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {REGIOES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Localização */}
          <Card>
            <CardHeader><CardTitle>Localização</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} placeholder="Endereço completo" />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="grid gap-2">
                  <Label>Cidade</Label>
                  <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Estado</Label>
                  <Input value={form.estado} onChange={(e) => set("estado", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>CEP</Label>
                  <Input value={form.cep} onChange={(e) => set("cep", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>País</Label>
                  <Input value={form.pais} onChange={(e) => set("pais", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Dist. Disney (km)</Label>
                  <Input type="number" step="0.1" value={form.distancia_disney_km} onChange={(e) => set("distancia_disney_km", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Dist. Universal (km)</Label>
                  <Input type="number" step="0.1" value={form.distancia_universal_km} onChange={(e) => set("distancia_universal_km", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Dist. Outlet (km)</Label>
                  <Input type="number" step="0.1" value={form.distancia_outlet_km} onChange={(e) => set("distancia_outlet_km", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Serviços */}
          <Card>
            <CardHeader><CardTitle>Serviços e Estrutura</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center gap-3">
                <Switch checked={form.cafe_da_manha_incluso} onCheckedChange={(v) => set("cafe_da_manha_incluso", v)} />
                <Label>Café da manhã incluso</Label>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Estacionamento</Label>
                  <Select value={form.estacionamento_tipo} onValueChange={(v) => set("estacionamento_tipo", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ESTACIONAMENTOS.map((e) => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {form.estacionamento_tipo === "pago" && (
                  <div className="grid gap-2">
                    <Label>Valor diária estac. (USD)</Label>
                    <Input type="number" step="0.01" value={form.estacionamento_valor_diaria} onChange={(e) => set("estacionamento_valor_diaria", e.target.value)} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Tipo quarto família</Label>
                  <Input value={form.tipo_quarto_familia} onChange={(e) => set("tipo_quarto_familia", e.target.value)} placeholder="Ex: suíte 2 quartos, cozinha completa" />
                </div>
                <div className="grid gap-2">
                  <Label>Idiomas do staff</Label>
                  <Input value={form.idiomas_staff} onChange={(e) => set("idiomas_staff", e.target.value)} placeholder="Ex: inglês, espanhol, alguns falam português" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card>
            <CardHeader><CardTitle>Contato</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label>Site oficial</Label>
                <Input value={form.site_oficial} onChange={(e) => set("site_oficial", e.target.value)} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Email reservas</Label>
                  <Input type="email" value={form.email_reservas} onChange={(e) => set("email_reservas", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={4} placeholder="Informações adicionais sobre o hotel..." />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate("/hotels")}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Hotel"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
