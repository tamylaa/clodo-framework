export interface IServiceMiddleware {
  preprocess?(request: Request): Promise<Response | null> | Response | null;
  authenticate?(request: Request): Promise<Response | null> | Response | null;
  authorize?(request: Request, context?: any): Promise<boolean | Response | null>;
  validate?(request: Request): Promise<Response | null> | Response | null;
  postprocess?(response: Response): Promise<Response> | Response;
  error?(error: Error, request: Request): Promise<Response> | Response;
}

export interface IMiddlewareChain {
  execute(request: Request, handler: (req: Request) => Promise<Response>): Promise<Response>;
}
