// Middleware composer that runs middleware in sequence and supports short-circuiting
export class MiddlewareComposer {
  static compose(...middlewares) {
    const chain = middlewares.filter(Boolean);

    return {
      async execute(request, handler) {
        // Preprocess/auth/validate phases
        for (const m of chain) {
          if (typeof m.preprocess === 'function') {
            const res = await m.preprocess(request);
            if (res) return res;
          }

          if (typeof m.authenticate === 'function') {
            const res = await m.authenticate(request);
            if (res) return res;
          }

          if (typeof m.validate === 'function') {
            const res = await m.validate(request);
            if (res) return res;
          }
        }

        // Call the final handler
        let response = await handler(request);

        // Postprocess in reverse order
        for (const m of chain.slice().reverse()) {
          if (typeof m.postprocess === 'function') {
            const updated = await m.postprocess(response);
            // Allow middleware to replace response
            if (updated instanceof Response) response = updated;
          }
        }

        return response;
      }
    };
  }
}
