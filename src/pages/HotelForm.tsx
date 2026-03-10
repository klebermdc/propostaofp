import { useEffect, useState, useRef } from "react";
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
import { ArrowLeft, Save, Hotel, Upload, Trash2, Star, ImagePlus, Link as LinkIcon, SearchIcon, Check, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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

type HotelFoto = {
  id: string;
  hotel_id: number;
  url: string;
  legenda: string | null;
  is_capa: boolean;
  sort_order: number;
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
  const [fotos, setFotos] = useState<HotelFoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [legendaInput, setLegendaInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchResults, setSearchResults] = useState<{ url: string; thumbnail: string; title: string }[]>([]);
  const [selectedResults, setSelectedResults] = useState<Set<number>>(new Set());
  const [searching, setSearching] = useState(false);
  const [savingSelected, setSavingSelected] = useState(false);

  useEffect(() => {
    if (isEdit) {
      Promise.all([
        supabase.from("hoteis_orlando").select("*").eq("id", Number(id)).single(),
        supabase.from("hotel_fotos").select("*").eq("hotel_id", Number(id)).order("sort_order"),
      ]).then(([hotelRes, fotosRes]) => {
        if (hotelRes.error || !hotelRes.data) {
          toast({ title: "Hotel não encontrado", variant: "destructive" });
          navigate("/hotels");
          return;
        }
        const d = hotelRes.data as any;
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
        setFotos((fotosRes.data as unknown as HotelFoto[]) || []);
        setLoading(false);
      });
    }
  }, [id]);

  const set = (key: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEdit || !e.target.files?.length) return;
    setUploading(true);

    const files = Array.from(e.target.files);
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `hotel-${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("hotel-fotos")
        .upload(path, file);

      if (uploadError) {
        toast({ title: "Erro ao fazer upload", description: uploadError.message, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from("hotel-fotos").getPublicUrl(path);

      const { data: fotoData, error: insertError } = await supabase
        .from("hotel_fotos")
        .insert({
          hotel_id: Number(id),
          url: urlData.publicUrl,
          legenda: legendaInput || null,
          is_capa: fotos.length === 0,
          sort_order: fotos.length,
        })
        .select()
        .single();

      if (insertError) {
        toast({ title: "Erro ao salvar foto", description: insertError.message, variant: "destructive" });
      } else if (fotoData) {
        setFotos((prev) => [...prev, fotoData as unknown as HotelFoto]);
      }
    }

    setUploading(false);
    setLegendaInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddUrl = async () => {
    if (!isEdit || !urlInput.trim()) return;
    setUploading(true);

    const { data: fotoData, error } = await supabase
      .from("hotel_fotos")
      .insert({
        hotel_id: Number(id),
        url: urlInput.trim(),
        legenda: legendaInput || null,
        is_capa: fotos.length === 0,
        sort_order: fotos.length,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao adicionar foto", description: error.message, variant: "destructive" });
    } else if (fotoData) {
      setFotos((prev) => [...prev, fotoData as unknown as HotelFoto]);
      toast({ title: "Foto adicionada!" });
    }

    setUrlInput("");
    setLegendaInput("");
    setUploading(false);
  };

  const handleDeleteFoto = async (foto: HotelFoto) => {
    const { error } = await supabase.from("hotel_fotos").delete().eq("id", foto.id);
    if (error) {
      toast({ title: "Erro ao excluir foto", description: error.message, variant: "destructive" });
    } else {
      setFotos((prev) => prev.filter((f) => f.id !== foto.id));
    }
  };

  const handleSetCapa = async (fotoId: string) => {
    // Unset all, then set the selected one
    await supabase.from("hotel_fotos").update({ is_capa: false }).eq("hotel_id", Number(id));
    await supabase.from("hotel_fotos").update({ is_capa: true }).eq("id", fotoId);
    setFotos((prev) =>
      prev.map((f) => ({ ...f, is_capa: f.id === fotoId }))
    );
    toast({ title: "Foto de capa definida!" });
  };

  const handleSearchImages = async () => {
    if (!form.nome_hotel.trim()) {
      toast({ title: "Preencha o nome do hotel primeiro", variant: "destructive" });
      return;
    }
    setSearching(true);
    setSearchResults([]);
    setSelectedResults(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("search-hotel-images", {
        body: { query: form.nome_hotel, num: 8 },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro na busca");

      setSearchResults(data.images || []);
      if (data.images?.length === 0) {
        toast({ title: "Nenhuma imagem encontrada para este hotel" });
      } else {
        toast({ title: `${data.images.length} imagens encontradas!` });
      }
    } catch (err: any) {
      toast({ title: "Erro ao buscar imagens", description: err.message, variant: "destructive" });
    }
    setSearching(false);
  };

  const toggleResultSelection = (index: number) => {
    setSelectedResults((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSaveSelectedImages = async () => {
    if (!isEdit || selectedResults.size === 0) return;
    setSavingSelected(true);

    for (const index of selectedResults) {
      const img = searchResults[index];
      const { data: fotoData, error } = await supabase
        .from("hotel_fotos")
        .insert({
          hotel_id: Number(id),
          url: img.url,
          legenda: img.title || null,
          is_capa: fotos.length === 0 && index === Math.min(...selectedResults),
          sort_order: fotos.length + index,
        })
        .select()
        .single();

      if (!error && fotoData) {
        setFotos((prev) => [...prev, fotoData as unknown as HotelFoto]);
      }
    }

    toast({ title: `${selectedResults.size} foto(s) adicionada(s)!` });
    setSearchResults([]);
    setSelectedResults(new Set());
    setSavingSelected(false);
  };

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

          {/* Fotos do Hotel - Only show for edit mode */}
          {isEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImagePlus className="h-5 w-5" /> Fotos do Hotel
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {/* Existing photos grid */}
                {fotos.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {fotos.map((foto) => (
                      <div key={foto.id} className="group relative overflow-hidden rounded-lg border">
                        <img
                          src={foto.url}
                          alt={foto.legenda || "Foto do hotel"}
                          className="aspect-[4/3] w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                        {foto.is_capa && (
                          <div className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                            ⭐ Capa
                          </div>
                        )}
                        {foto.legenda && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white">
                            {foto.legenda}
                          </div>
                        )}
                        <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {!foto.is_capa && (
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7"
                              onClick={() => handleSetCapa(foto.id)}
                              title="Definir como capa"
                            >
                              <Star className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-7 w-7"
                            onClick={() => handleDeleteFoto(foto)}
                            title="Excluir foto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {fotos.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-muted-foreground">
                    <ImagePlus className="mb-2 h-8 w-8" />
                    <p className="text-sm">Nenhuma foto adicionada</p>
                  </div>
                )}

                {/* Legenda input shared */}
                <div className="grid gap-2">
                  <Label>Legenda (opcional)</Label>
                  <Input
                    value={legendaInput}
                    onChange={(e) => setLegendaInput(e.target.value)}
                    placeholder="Ex: Vista da piscina, Lobby, Quarto família..."
                  />
                </div>

                {/* Upload file */}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex-1 gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? "Enviando..." : "Upload de Fotos"}
                  </Button>
                </div>

                {/* Add by URL */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Colar URL da imagem..."
                      className="pl-10"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleAddUrl}
                    disabled={uploading || !urlInput.trim()}
                  >
                    Adicionar
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou busque automaticamente</span></div>
                </div>

                {/* Auto-search button */}
                <Button
                  variant="default"
                  onClick={handleSearchImages}
                  disabled={searching || !form.nome_hotel.trim()}
                  className="w-full gap-2"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
                  {searching ? "Buscando fotos..." : "🔍 Buscar Fotos do Hotel (Google)"}
                </Button>

                {/* Search results grid */}
                {searchResults.length > 0 && (
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{searchResults.length} imagens encontradas — selecione as que deseja adicionar:</p>
                      <Button
                        size="sm"
                        onClick={handleSaveSelectedImages}
                        disabled={selectedResults.size === 0 || savingSelected}
                        className="gap-1"
                      >
                        {savingSelected ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Adicionar {selectedResults.size > 0 ? `(${selectedResults.size})` : ""}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {searchResults.map((img, i) => (
                        <div
                          key={i}
                          className={`group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
                            selectedResults.has(i) ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"
                          }`}
                          onClick={() => toggleResultSelection(i)}
                        >
                          <img
                            src={img.thumbnail || img.url}
                            alt={img.title}
                            className="aspect-[4/3] w-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                          />
                          {selectedResults.has(i) && (
                            <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white line-clamp-1">
                            {img.title || "Imagem"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Faça upload, cole URLs ou busque automaticamente fotos do hotel via Google Images (SerpAPI). A primeira foto será a capa.
                </p>
              </CardContent>
            </Card>
          )}

          {!isEdit && (
            <Card className="border-dashed">
              <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
                <ImagePlus className="h-5 w-5 shrink-0" />
                <span>Salve o hotel primeiro para adicionar fotos.</span>
              </CardContent>
            </Card>
          )}

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
