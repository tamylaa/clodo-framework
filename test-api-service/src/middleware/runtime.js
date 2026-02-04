// Lightweight middleware runtime for generated services
export const MiddlewareRegistry = (() => {
  const map = new Map();
  return {
    register(serviceName, instance) { map.set(serviceName, instance); },
    get(serviceName) { return map.get(serviceName) || null; },
    clear() { map.clear(); }
  };
})();

export const MiddlewareComposer = {
  compose(...middlewares) {
    const chain = middlewares.filter(Boolean);
    return {
      async execute(request, handler) {
        let req = request;
        for (const m of chain) {
          if (typeof m.preprocess === 'function') {
            const res = await m.preprocess(req);
            if (res) return res;
          }
          if (typeof m.authenticate === 'function') {
            const res = await m.authenticate(req);
            if (res) return res;
          }
          if (typeof m.validate === 'function') {
            const res = await m.validate(req);
            if (res) return res;
          }
        }
        let response = await handler(req);
        for (const m of chain.slice().reverse()) {
          if (typeof m.postprocess === 'function') {
            const updated = await m.postprocess(response);
            if (updated instanceof Response) response = updated;
          }
        }
        return response;
      }
    };
  }
};
