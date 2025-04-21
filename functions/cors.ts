// supabase/functions/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Hilfsfunktion für OPTIONS-Requests (Preflight)
export function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

// Hilfsfunktion zum Hinzufügen von CORS-Headers zu einer Response
export function addCorsHeaders(response: Response): Response {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
} 