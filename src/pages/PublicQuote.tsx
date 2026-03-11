import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Plane, MessageCircle, Mail, Calendar, Sparkles, Star,
  CheckCircle2, Clock, Shield, ArrowRight, Wand2,
} from "lucide-react";
import { itemTypeConfig } from "@/lib/quote-item-types";
import { HotelDetails, type HotelData } from "@/components/public-quote/HotelDetails";
import { AppLogo } from "@/components/AppLogo";
import { ReclameAquiSeal } from "@/components/ReclameAquiSeal";
import type { Database } from "@/integrations/supabase/types";

type Quote = Database["public"]["Tables"]["quotes"]["Row"];
type QuoteItem = Database["public"]["Tables"]["quote_items"]["Row"];

/* ── Sparkle particles ── */
function MagicParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `radial-gradient(circle, hsl(${35 + Math.random() * 20}, 95%, ${65 + Math.random() * 20}%) 0%, transparent 70%)`,
          }}
          animate={{
            y: [0, -30 - Math.random() * 40, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ── Animated section wrapper ── */
function FadeInSection({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Cinderella Castle image ── */
import castleImage from "@/assets/castle-disney.png";

function CastleSilhouette() {
  return (
    <img
      src={castleImage}
      alt="Castelo da Cinderela"
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[320px] sm:w-[450px] opacity-20 pointer-events-none select-none"
    />
  );
}

/* ── Firework burst ── */
function FireworkBurst({ delay = 0 }: { delay: number }) {
  return (
    <motion.div
      className="absolute"
      style={{ left: `${20 + Math.random() * 60}%`, top: `${10 + Math.random() * 40}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
      transition={{ duration: 2, delay, repeat: Infinity, repeatDelay: 5 + Math.random() * 3 }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-accent"
          animate={{
            x: Math.cos((i * Math.PI * 2) / 8) * 20,
            y: Math.sin((i * Math.PI * 2) / 8) * 20,
            opacity: [1, 0],
          }}
          transition={{ duration: 1, delay: delay + 0.3 }}
        />
      ))}
    </motion.div>
  );
}

export default function PublicQuote() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [hotelDataMap, setHotelDataMap] = useState<Record<number, HotelData>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (shareToken) fetchQuote();
  }, [shareToken]);

  useEffect(() => {
    if (quote) {
      const clientPart = quote.client_name ? ` para ${quote.client_name}` : "";
      document.title = `Proposta Mágica${clientPart} — Orlando Fast Pass`;
      // Delay content reveal for entrance animation
      setTimeout(() => setShowContent(true), 300);
    }
    return () => { document.title = "Orlando Fast Pass — Sua viagem dos sonhos"; };
  }, [quote]);

  const fetchQuote = async () => {
    const { data: quoteData, error } = await supabase
      .from("quotes").select("*").eq("share_token", shareToken!).single();

    if (error || !quoteData) { setNotFound(true); setLoading(false); return; }

    const { data: itemsData } = await supabase
      .from("quote_items").select("*").eq("quote_id", quoteData.id).order("sort_order");

    const allItems = itemsData || [];
    const hotelIds = allItems
      .filter((i) => i.item_type === "hotel" && (i.metadata as any)?.hotel_id)
      .map((i) => (i.metadata as any).hotel_id as number);
    const uniqueHotelIds = [...new Set(hotelIds)];

    if (uniqueHotelIds.length > 0) {
      const [{ data: hotels }, { data: fotos }] = await Promise.all([
        supabase.from("hoteis_orlando").select("*").in("id", uniqueHotelIds),
        supabase.from("hotel_fotos").select("*").in("hotel_id", uniqueHotelIds).order("sort_order"),
      ]);
      const map: Record<number, HotelData> = {};
      (hotels || []).forEach((h) => {
        map[h.id] = { hotel: h, fotos: (fotos || []).filter((f) => f.hotel_id === h.id) };
      });
      setHotelDataMap(map);
    }

    setQuote(quoteData); setItems(allItems); setLoading(false);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(220,30%,6%)]">
        <motion.div
          className="flex flex-col items-center gap-5"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative">
            <motion.div
              className="h-16 w-16 rounded-full border-[3px] border-accent/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Wand2 className="h-6 w-6 text-accent" />
            </motion.div>
          </div>
          <motion.p
            className="text-white/50 text-sm font-medium font-display"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Preparando sua magia...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  /* ── Not Found ── */
  if (notFound || !quote) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(220,30%,6%)] px-4">
        <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
            <Plane className="h-10 w-10 text-accent/60" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Proposta não encontrada</h1>
          <p className="mt-3 text-white/50 max-w-sm mx-auto">
            Esta proposta pode ter expirado ou não estar mais disponível.
          </p>
        </motion.div>
      </div>
    );
  }

  const subtotal = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const total = subtotal - quote.discount;
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.item_type]) acc[item.item_type] = [];
    acc[item.item_type].push(item);
    return acc;
  }, {} as Record<string, QuoteItem[]>);

  const whatsappUrl = quote.client_phone
    ? `https://wa.me/${quote.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá! Amei a proposta mágica "${quote.title}" e quero fechar! ✨🏰`
      )}`
    : null;
  const whatsappGenericUrl = `https://wa.me/?text=${encodeURIComponent(
    `Olá! Vi a proposta "${quote.title}" e quero saber mais!`
  )}`;

  return (
    <div className="min-h-screen bg-[hsl(220,30%,6%)] text-white overflow-hidden">
      <style>{`
        .magic-gradient { background: linear-gradient(135deg, hsl(25,90%,45%) 0%, hsl(35,100%,55%) 40%, hsl(40,95%,50%) 100%); }
        .glass-card { background: rgba(255,255,255,0.04); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
        .glow-accent { box-shadow: 0 0 40px hsl(35,95%,52%,0.25), 0 4px 60px hsl(35,95%,52%,0.1); }
        .glow-btn { box-shadow: 0 0 20px hsl(35,95%,52%,0.4), 0 0 60px hsl(35,95%,52%,0.15); }
        .shimmer { background: linear-gradient(110deg, transparent 33%, rgba(255,255,255,0.08) 50%, transparent 67%); background-size: 300% 100%; animation: shimmer 3s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .star-field { background-image: radial-gradient(2px 2px at 20px 30px, white, transparent), radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent), radial-gradient(1px 1px at 90px 40px, white, transparent), radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.6), transparent), radial-gradient(2px 2px at 160px 30px, white, transparent); background-size: 200px 100px; animation: twinkle 4s ease-in-out infinite alternate; }
        @keyframes twinkle { 0%{opacity:0.3} 100%{opacity:0.7} }
      `}</style>

      {/* ── HERO ── */}
      <div className="relative overflow-hidden">
        {/* Night sky background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,40%,8%)] via-[hsl(230,35%,12%)] to-[hsl(220,30%,6%)]" />
        <div className="absolute inset-0 star-field" />
        <MagicParticles />
        <FireworkBurst delay={1} />
        <FireworkBurst delay={3.5} />
        <FireworkBurst delay={6} />
        <CastleSilhouette />

        <div className="relative z-10 px-4 pt-8 pb-16 sm:pb-20">
          <div className="mx-auto max-w-3xl">
            {/* Brand */}
            <motion.div
              className="flex flex-col items-center mb-10"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative">
                <AppLogo variant="light" className="h-28 sm:h-36 w-auto drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]" />
                <div className="absolute -inset-4 bg-gradient-to-b from-white/5 to-transparent rounded-2xl blur-xl -z-10" />
              </div>
              {quote.valid_until && (
                <div className="flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1.5 text-xs text-white/70 mt-5">
                  <Clock className="h-3 w-3" />
                  Até {new Date(quote.valid_until).toLocaleDateString("pt-BR")}
                </div>
              )}
            </motion.div>

            {/* Title */}
            <div className="text-center sm:text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-accent border border-accent/20 mb-4">
                  <Wand2 className="h-3 w-3" /> Proposta Exclusiva
                </span>
              </motion.div>

              <motion.h1
                className="font-display text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                  Proposta
                </span>
                <br />
                <span className="bg-gradient-to-r from-accent via-[hsl(40,100%,65%)] to-accent bg-clip-text text-transparent">
                  Mágica ✨
                </span>
              </motion.h1>

              {quote.client_name && (
                <motion.p
                  className="mt-4 text-lg text-white/60"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                >
                  Preparada com carinho para{" "}
                  <span className="font-semibold text-white">{quote.client_name}</span>
                </motion.p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            className="mx-auto max-w-3xl px-4 pb-16 space-y-6 relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Trust Badges */}
            <FadeInSection delay={0.1}>
              <div className="glass-card rounded-2xl p-4 flex flex-wrap justify-center gap-6 sm:gap-10 shimmer">
                {[
                  { icon: Shield, text: "Pagamento Seguro" },
                  { icon: Star, text: "Melhor Preço" },
                  { icon: CheckCircle2, text: "Experiência Garantida" },
                ].map(({ icon: Icon, text }) => (
                  <motion.div
                    key={text}
                    className="flex items-center gap-2 text-white/70"
                    whileHover={{ scale: 1.05, color: "rgba(255,255,255,0.9)" }}
                  >
                    <Icon className="h-4 w-4 text-accent" />
                    <span className="text-xs font-medium">{text}</span>
                  </motion.div>
                ))}
              </div>
            </FadeInSection>

            {/* Items grouped by type */}
            {Object.entries(grouped).map(([type, typeItems], groupIdx) => {
              const config = itemTypeConfig[type as keyof typeof itemTypeConfig];
              const Icon = config.icon;
              return (
                <FadeInSection key={type} delay={0.15 * (groupIdx + 1)}>
                  <Card className="overflow-hidden rounded-2xl border-white/[0.06] bg-white/[0.03] backdrop-blur-md shadow-2xl">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
                      <motion.div
                        className="flex h-9 w-9 items-center justify-center rounded-xl magic-gradient shadow-md"
                        whileHover={{ rotate: 10, scale: 1.1 }}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </motion.div>
                      <h2 className="font-display text-lg font-semibold text-white">{config.label}</h2>
                      <Badge variant="outline" className="ml-auto border-accent/20 text-accent/70 text-xs bg-accent/5">
                        {typeItems.length} {typeItems.length === 1 ? "item" : "itens"}
                      </Badge>
                    </div>
                    <CardContent className="divide-y divide-white/[0.04] p-0">
                      {typeItems.map((item, itemIdx) => {
                        const hotelId = (item.metadata as any)?.hotel_id;
                        const hotelData = hotelId ? hotelDataMap[hotelId] : null;
                        return (
                          <motion.div
                            key={item.id}
                            className="p-5 space-y-3"
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: itemIdx * 0.1, duration: 0.5 }}
                            whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-white">{item.description}</p>
                                {(item.start_date || item.end_date) && (
                                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/50">
                                    <Calendar className="h-3.5 w-3.5 text-accent/60" />
                                    {item.start_date && new Date(item.start_date).toLocaleDateString("pt-BR")}
                                    {item.start_date && item.end_date && " → "}
                                    {item.end_date && new Date(item.end_date).toLocaleDateString("pt-BR")}
                                  </p>
                                )}
                                {item.observations && (
                                  <p className="mt-1.5 text-sm text-white/40">{item.observations}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <motion.p
                                  className="text-lg font-bold text-accent"
                                  whileInView={{ scale: [0.9, 1.05, 1] }}
                                  viewport={{ once: true }}
                                  transition={{ delay: itemIdx * 0.1 + 0.3, duration: 0.5 }}
                                >
                                  R$ {(item.unit_price * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </motion.p>
                                {item.quantity > 1 && (
                                  <p className="text-xs text-white/40 mt-0.5">
                                    {item.quantity}x R$ {item.unit_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </p>
                                )}
                                {quote.installment_count > 1 && item.unit_price > 0 && (
                                  <p className="text-xs text-accent/60 mt-0.5">
                                    ou {quote.installment_count}x R$ {((item.unit_price * item.quantity) / quote.installment_count).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </p>
                                )}
                              </div>
                            </div>
                            {hotelData && <HotelDetails {...hotelData} />}
                          </motion.div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </FadeInSection>
              );
            })}

            {/* ── TOTAL — DESTAQUE PRINCIPAL ── */}
            <FadeInSection delay={0.2}>
              <motion.div
                whileInView={{ scale: [0.95, 1] }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="relative rounded-3xl overflow-hidden">
                  {/* Animated border glow */}
                  <div className="absolute -inset-[1px] magic-gradient rounded-3xl opacity-60" />
                  <div className="absolute -inset-[1px] magic-gradient rounded-3xl opacity-30 blur-md" />
                  
                  <Card className="relative overflow-hidden rounded-3xl border-0 bg-[hsl(220,30%,8%)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-transparent to-accent/5" />
                    <MagicParticles />
                    <CardContent className="relative p-8 sm:p-10 space-y-4">
                      {/* Small details */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-white/50">
                          <span>Subtotal</span>
                          <span>R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                        {quote.discount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-success flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> Desconto mágico
                            </span>
                            <span className="text-success font-medium">
                              - R$ {quote.discount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>

                      <Separator className="bg-white/10" />

                      {/* Main total */}
                      <div className="text-center pt-2 pb-2">
                        <p className="text-sm text-white/50 mb-2 uppercase tracking-widest font-medium">Investimento total</p>
                        <motion.div
                          whileInView={{ scale: [0.7, 1.08, 1] }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <p className="text-5xl sm:text-6xl font-display font-bold bg-gradient-to-r from-accent via-[hsl(40,100%,70%)] to-accent bg-clip-text text-transparent leading-none">
                            R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </motion.div>
                        {quote.installment_count > 1 && total > 0 && (
                          <motion.p
                            className="mt-3 text-white/60 text-base"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 }}
                          >
                            ou <span className="font-semibold text-white text-lg">{quote.installment_count}x</span>{" "}
                            de <span className="font-bold text-accent text-xl">R$ {(total / quote.installment_count).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          </motion.p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </FadeInSection>



            {/* ── CTA SECTION ── */}
            <FadeInSection delay={0.2}>
              <div className="relative rounded-2xl overflow-hidden">
                <div className="absolute inset-0 magic-gradient opacity-[0.08]" />
                <MagicParticles />
                <div className="relative glass-card rounded-2xl p-8 sm:p-10 text-center space-y-6">
                  <motion.div
                    className="inline-flex h-20 w-20 items-center justify-center rounded-full magic-gradient shadow-xl mx-auto"
                    animate={{ boxShadow: ["0 0 20px hsl(35,95%,52%,0.3)", "0 0 40px hsl(35,95%,52%,0.5)", "0 0 20px hsl(35,95%,52%,0.3)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    whileHover={{ scale: 1.1, rotate: 15 }}
                  >
                    <Wand2 className="h-9 w-9 text-white" />
                  </motion.div>

                  <div>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                      A magia está a um clique
                    </h2>
                    <p className="text-white/50 max-w-md mx-auto mt-3 text-sm sm:text-base">
                      Garanta sua viagem dos sonhos para Orlando com as melhores condições. Fale com nosso time agora!
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-2">
                    {whatsappUrl && (
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Button asChild size="lg" className="gap-2 magic-gradient text-white glow-btn rounded-xl text-base px-8 h-13 font-semibold w-full sm:w-auto border-0">
                          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="h-5 w-5" />
                            Quero essa magia!
                            <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                              <ArrowRight className="h-4 w-4" />
                            </motion.span>
                          </a>
                        </Button>
                      </motion.div>
                    )}
                    {quote.client_email && (
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Button asChild size="lg" className="gap-2 glass-card text-white hover:bg-white/10 rounded-xl text-base px-8 h-13 border-white/15 w-full sm:w-auto">
                          <a href={`mailto:${quote.client_email}?subject=Proposta Mágica - ${quote.title}&body=Olá, quero fechar minha viagem mágica!`}>
                            <Mail className="h-5 w-5" /> Enviar email
                          </a>
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </FadeInSection>

            {/* Notes */}
            {quote.notes && (
              <FadeInSection>
                <Card className="rounded-2xl border-white/[0.06] bg-white/[0.03] backdrop-blur-sm">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" /> Condições e observações
                    </p>
                    <p className="text-sm text-white/60 whitespace-pre-wrap leading-relaxed">{quote.notes}</p>
                  </CardContent>
                </Card>
              </FadeInSection>
            )}

            {/* Small CTA */}
            <FadeInSection>
              <div className="text-center space-y-3 py-4">
                <p className="text-white/40 text-sm">Alguma dúvida? Estamos aqui!</p>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild variant="outline" className="rounded-full border-accent/30 text-accent hover:bg-accent/10 px-6">
                    <a href={whatsappUrl || whatsappGenericUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4 mr-2" /> Tirar dúvidas
                    </a>
                  </Button>
                </motion.div>
              </div>
            </FadeInSection>

            {/* Footer */}
            <motion.div
              className="pt-8 pb-6 text-center border-t border-white/5"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center justify-center">
                <AppLogo size="sm" variant="light" className="opacity-30" />
              </div>
              <p className="text-white/15 text-xs mt-2">Transformando sonhos em realidade ✨</p>
              <ReclameAquiSeal />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
