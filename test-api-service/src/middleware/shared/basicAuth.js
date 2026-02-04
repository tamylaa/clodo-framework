export function basicAuth({ realm = 'Restricted' } = {}) {
  return {
    authenticate(request) {
      const auth = request.headers.get('Authorization');
      if (!auth) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Basic realm="' + realm + '"' }
        });
      }
      return null;
    }
  };
}
