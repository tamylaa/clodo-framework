export function cors(options = {}) {
  const origin = options.origin || '*';
  const allowMethods = options.methods || 'GET, POST, PUT, DELETE, OPTIONS';
  const allowHeaders = options.headers || 'Content-Type, Authorization';

  return {
    preprocess(request) {
      if (request.method === 'OPTIONS') {
        const headers = new Headers();
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Access-Control-Allow-Methods', allowMethods);
        headers.set('Access-Control-Allow-Headers', allowHeaders);
        return new Response(null, { status: 204, headers });
      }
      return null;
    },

    postprocess(response) {
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', origin);
      return new Response(response.body, { ...response, headers });
    }
  };
}
