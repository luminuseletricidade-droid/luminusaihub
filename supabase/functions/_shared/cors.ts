// CORS headers configuration for all Edge Functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Max-Age': '86400', // 24 hours
};

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * Create a successful JSON response with CORS headers
 */
export function createJsonResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create an error response with CORS headers
 */
export function createErrorResponse(error: string | Error, status: number = 500) {
  const errorMessage = error instanceof Error ? error.message : error;

  return new Response(JSON.stringify({
    error: errorMessage,
    success: false,
  }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
