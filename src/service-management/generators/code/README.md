# Code Generators

Generators for application code (schemas, handlers, middleware, utilities).

## Generators in this directory

- **SchemaGenerator** - Generates Zod schemas for data validation
- **HandlerGenerator** - Generates service-type specific request handlers (CRUD, auth, etc.)
- **MiddlewareGenerator** - Generates middleware (CORS, auth, logging, error handling)
- **UtilsGenerator** - Generates utility functions (logger, validator, response helpers)

## Priority

**P1-P2 priority** - Core to service functionality but can be extracted in parallel.

## Status

- [ ] SchemaGenerator (REFACTOR-13)
- [ ] HandlerGenerator (REFACTOR-14)
- [ ] MiddlewareGenerator (REFACTOR-15)
- [ ] UtilsGenerator (REFACTOR-16)
