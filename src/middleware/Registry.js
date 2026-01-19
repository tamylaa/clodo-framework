// Registry for service-specific middleware implementations
export class MiddlewareRegistry {
  static implementations = new Map();

  static register(serviceName, middleware) {
    if (!serviceName) throw new Error('serviceName is required');
    this.implementations.set(serviceName, middleware);
  }

  static get(serviceName) {
    return this.implementations.get(serviceName) || null;
  }

  static clear() {
    this.implementations.clear();
  }
}
