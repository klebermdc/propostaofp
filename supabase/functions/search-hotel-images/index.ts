const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, num } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('SERPAPI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'SERPAPI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchQuery = `${query} hotel Orlando Florida exterior`;
    const params = new URLSearchParams({
      engine: 'google_images',
      q: searchQuery,
      api_key: apiKey,
      num: String(num || 6),
      ijn: '0',
      safe: 'active',
    });

    console.log('Searching images for:', searchQuery);

    const response = await fetch(`https://serpapi.com/search.json?${params}`);
    const data = await response.json();

    if (!response.ok) {
      console.error('SerpAPI error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || 'SerpAPI request failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const images = (data.images_results || []).slice(0, num || 6).map((img: any) => ({
      url: img.original,
      thumbnail: img.thumbnail,
      title: img.title || '',
      source: img.source || '',
      width: img.original_width,
      height: img.original_height,
    }));

    console.log(`Found ${images.length} images`);

    return new Response(
      JSON.stringify({ success: true, images }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error searching images:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
