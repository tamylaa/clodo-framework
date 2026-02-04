export function logging(options = {}) {
  const level = options.level || 'info';
  return {
    preprocess(request) {
      try {
        const path = new URL(request.url).pathname;
        console.log('[' + new Date().toISOString() + '] ' + level.toUpperCase() + ' ' + request.method + ' ' + path);
      } catch (e) {}
      return null;
    }
  };
}
