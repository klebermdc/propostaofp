import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_url, file_path, cart_url } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contentParts: any[] = [];

    // If cart_url is provided, fetch the page HTML and send as text
    if (cart_url) {
      console.log("Fetching cart URL:", cart_url);
      const pageResponse = await fetch(cart_url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        },
      });

      if (!pageResponse.ok) {
        throw new Error(`Falha ao acessar a página: ${pageResponse.status}`);
      }

      const pageHtml = await pageResponse.text();
      console.log("Page HTML length:", pageHtml.length);

      contentParts.push({
        type: "text",
        text: `Analise o HTML desta página de checkout/carrinho de um site de venda de ingressos e passeios para Orlando.
Extraia TODOS os itens do carrinho encontrados no HTML.

Para cada item, identifique:
- Tipo de serviço (hotel, flight, transfer, tour, insurance, ticket, other) - ingressos de parques devem ser "ticket", passeios devem ser "tour"
- Nome/descrição do produto
- Data de uso (formato YYYY-MM-DD se disponível)
- Valor unitário em reais (número decimal) - procure por preços no HTML
- Quantidade de adultos e crianças (separe como itens distintos se tiver preços diferentes)

HTML da página:
${pageHtml.substring(0, 100000)}

Retorne os dados usando a função extract_items.`,
      });
    } else {
      contentParts.push({
        type: "text",
        text: `Analise esta imagem/documento de cotação de viagem e extraia todos os itens de serviço encontrados.
Para cada item, identifique:
- Tipo de serviço (hotel, flight, transfer, tour, insurance, ticket, other)
- Descrição detalhada
- Datas de início e fim (formato YYYY-MM-DD se disponíveis)
- Valor unitário em reais (número decimal)
- Quantidade

Retorne os dados usando a função extract_items.`,
      });

      if (image_url) {
        contentParts.push({
          type: "image_url",
          image_url: { url: image_url },
        });
      }
    }

    const body: any = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: contentParts,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_items",
            description:
              "Extract travel quote items from the provided content.",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      item_type: {
                        type: "string",
                        enum: [
                          "hotel",
                          "flight",
                          "transfer",
                          "tour",
                          "insurance",
                          "ticket",
                          "other",
                        ],
                      },
                      description: { type: "string" },
                      start_date: {
                        type: "string",
                        description: "Date in YYYY-MM-DD format or null",
                      },
                      end_date: {
                        type: "string",
                        description: "Date in YYYY-MM-DD format or null",
                      },
                      unit_price: { type: "number" },
                      quantity: { type: "integer", minimum: 1 },
                      observations: { type: "string" },
                    },
                    required: [
                      "item_type",
                      "description",
                      "unit_price",
                      "quantity",
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: ["items"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "extract_items" },
      },
    };

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao processar com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await aiResponse.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(
        JSON.stringify({ items: [], message: "Nenhum item extraído" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
