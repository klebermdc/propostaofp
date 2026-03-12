import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QuoteItem {
  item_type: string;
  description: string;
  unit_price: number;
  quantity: number;
  start_date?: string;
  end_date?: string;
  observations?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, total } = await req.json() as { items: QuoteItem[]; total: number };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    // Step 1: Search competitor prices via Firecrawl
    const searchResults: string[] = [];

    if (FIRECRAWL_API_KEY) {
      // Search specific competitor sites
      const targetSites = [
        "vmzviagens.com.br",
        "tioorlando.com.br",
        "decolar.com",
        "booking.com",
      ];
      const searchQueries = buildSearchQueries(items, targetSites);

      const searchPromises = searchQueries.map(async (query) => {
        try {
          const response = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: 5,
              lang: "pt-BR",
              country: "BR",
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.data) {
              for (const result of data.data) {
                const snippet = [
                  result.title,
                  result.description,
                  result.url,
                ].filter(Boolean).join(" | ");
                searchResults.push(snippet);
              }
            }
          }
        } catch (e) {
          console.error("Firecrawl search error:", e);
        }
      });

      await Promise.all(searchPromises);
      console.log(`Firecrawl returned ${searchResults.length} results`);
    }

    // Step 2: Build items summary for AI
    const itemsSummary = items.map((item, i) => {
      const parts = [
        `${i + 1}. [${item.item_type}] ${item.description}`,
        `   Preço: R$ ${item.unit_price.toFixed(2)} x ${item.quantity} = R$ ${(item.unit_price * item.quantity).toFixed(2)}`,
      ];
      if (item.start_date) parts.push(`   Data: ${item.start_date}${item.end_date ? ` a ${item.end_date}` : ""}`);
      if (item.observations) parts.push(`   Obs: ${item.observations}`);
      return parts.join("\n");
    }).join("\n\n");

    const searchContext = searchResults.length > 0
      ? `\n\n## Resultados de pesquisa de mercado (dados reais de sites brasileiros):\n${searchResults.join("\n---\n")}`
      : "";

    // Step 3: AI analysis
    const prompt = `Você é um analista de mercado especializado em turismo para Orlando, FL.
Analise o orçamento abaixo e compare com os preços praticados por agências brasileiras como VMZ Viagens, Tio Orlando, Decolar, Booking.com, CVC, ViajaNet, Hurb.

## Orçamento do cliente:
${itemsSummary}

**Total do orçamento: R$ ${total.toFixed(2)}**
${searchContext}

## Sua análise deve conter:

Para CADA item do orçamento:
1. Se o preço está abaixo, na média ou acima do mercado
2. Uma estimativa da faixa de preço praticada por concorrentes (mínimo - máximo)
3. Qual agência costuma ter o melhor preço para esse tipo de produto

No final, dê uma avaliação geral:
- O orçamento total está competitivo?
- Pontos fortes (itens com bom preço)
- Pontos de atenção (itens acima da média)
- Sugestão de margem de negociação

Use emojis para facilitar a leitura (🟢 bom preço, 🟡 na média, 🔴 acima).
Responda em português brasileiro. Seja direto e objetivo.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao processar análise de mercado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await aiResponse.json();
    const analysis = result.choices?.[0]?.message?.content || "Não foi possível gerar a análise.";

    return new Response(
      JSON.stringify({ analysis, sources_count: searchResults.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSearchQueries(items: QuoteItem[], sites: string[]): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.item_type + item.description)) continue;
    seen.add(item.item_type + item.description);

    let baseQuery = "";
    switch (item.item_type) {
      case "hotel":
        baseQuery = `${item.description} Orlando diária preço`;
        break;
      case "ticket":
        baseQuery = `ingresso ${item.description} Orlando preço reais`;
        break;
      case "tour":
        baseQuery = `passeio ${item.description} Orlando preço`;
        break;
      case "transfer":
        baseQuery = `transfer aeroporto Orlando preço`;
        break;
      case "insurance":
        baseQuery = `seguro viagem Orlando preço`;
        break;
      case "flight":
        baseQuery = `passagem aérea Orlando preço`;
        break;
      default:
        baseQuery = `${item.description} Orlando preço`;
    }

    // Create site-specific searches
    for (const site of sites) {
      queries.push(`site:${site} ${baseQuery}`);
    }
  }

  // Limit to 8 searches to balance coverage vs rate limits
  return queries.slice(0, 8);
}
